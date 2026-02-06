/**
 * OnionXBT Database Layer
 * SQLite with better-sqlite3
 */

import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface User {
  id: string
  created_at: string
  last_seen: string | null
  btc_address: string | null
  address_index: number | null
  balance: number
  total_deposited: number
  total_spent: number
}

export interface Payment {
  id: string
  user_id: string
  type: 'onchain' | 'lightning'
  address?: string
  invoice?: string
  payment_hash?: string
  amount: number
  status: 'pending' | 'confirmed' | 'expired'
  created_at: string
  confirmed_at?: string
  txid?: string
}

export interface Skill {
  id: string
  name: string
  description: string
  author_id: string | null
  icon: string
  price: number
  version: string
  installs: number
  rating: number
  rating_count: number
  tags: string[]
  code_path: string
  created_at: string
  updated_at: string | null
}

export class OnionDB {
  private db: Database.Database

  constructor(dbPath: string = './data/onionxbt.db') {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initSchema()
  }

  private initSchema() {
    const schemaPath = join(__dirname, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    this.db.exec(schema)
  }

  // User methods
  createUser(btcAddress?: string, addressIndex?: number): User {
    const id = uuid()
    const stmt = this.db.prepare(`
      INSERT INTO users (id, btc_address, address_index)
      VALUES (?, ?, ?)
    `)
    stmt.run(id, btcAddress, addressIndex)
    return this.getUser(id)!
  }

  getUser(id: string): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(id) as User | undefined
  }

  updateUserBalance(userId: string, delta: number): void {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET balance = balance + ?, 
          last_seen = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(delta, userId)
  }

  chargeUser(userId: string, amount: number, type: string, details?: object): boolean {
    const user = this.getUser(userId)
    if (!user || user.balance < amount) return false

    const txn = this.db.transaction(() => {
      // Deduct balance
      this.db.prepare(`
        UPDATE users 
        SET balance = balance - ?, 
            total_spent = total_spent + ?
        WHERE id = ?
      `).run(amount, amount, userId)

      // Record usage
      this.db.prepare(`
        INSERT INTO usage (id, user_id, type, cost, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuid(), userId, type, amount, JSON.stringify(details || {}))
    })

    txn()
    return true
  }

  // Payment methods
  createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'status'>): Payment {
    const id = uuid()
    const stmt = this.db.prepare(`
      INSERT INTO payments (id, user_id, type, address, invoice, payment_hash, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      payment.user_id,
      payment.type,
      payment.address,
      payment.invoice,
      payment.payment_hash,
      payment.amount
    )
    return this.getPayment(id)!
  }

  getPayment(id: string): Payment | undefined {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE id = ?')
    return stmt.get(id) as Payment | undefined
  }

  getPaymentByHash(hash: string): Payment | undefined {
    const stmt = this.db.prepare('SELECT * FROM payments WHERE payment_hash = ?')
    return stmt.get(hash) as Payment | undefined
  }

  confirmPayment(paymentId: string, txid?: string): void {
    const payment = this.getPayment(paymentId)
    if (!payment) return

    const txn = this.db.transaction(() => {
      // Update payment status
      this.db.prepare(`
        UPDATE payments 
        SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, txid = ?
        WHERE id = ?
      `).run(txid, paymentId)

      // Credit user balance
      this.db.prepare(`
        UPDATE users 
        SET balance = balance + ?, total_deposited = total_deposited + ?
        WHERE id = ?
      `).run(payment.amount, payment.amount, payment.user_id)
    })

    txn()
  }

  // Skill methods
  createSkill(skill: Omit<Skill, 'id' | 'created_at' | 'updated_at' | 'installs' | 'rating' | 'rating_count'>): Skill {
    const id = uuid()
    const stmt = this.db.prepare(`
      INSERT INTO skills (id, name, description, author_id, icon, price, version, tags, code_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      skill.name,
      skill.description,
      skill.author_id,
      skill.icon,
      skill.price,
      skill.version,
      JSON.stringify(skill.tags),
      skill.code_path
    )
    return this.getSkill(id)!
  }

  getSkill(id: string): Skill | undefined {
    const stmt = this.db.prepare('SELECT * FROM skills WHERE id = ?')
    const row = stmt.get(id) as any
    if (!row) return undefined
    return { ...row, tags: JSON.parse(row.tags || '[]') }
  }

  getAllSkills(): Skill[] {
    const stmt = this.db.prepare('SELECT * FROM skills ORDER BY installs DESC')
    const rows = stmt.all() as any[]
    return rows.map(row => ({ ...row, tags: JSON.parse(row.tags || '[]') }))
  }

  installSkill(userId: string, skillId: string): boolean {
    const skill = this.getSkill(skillId)
    const user = this.getUser(userId)
    
    if (!skill || !user) return false
    
    // Check if user can afford it (if paid)
    if (skill.price > 0 && user.balance < skill.price) return false

    const txn = this.db.transaction(() => {
      // Charge user if paid skill
      if (skill.price > 0) {
        this.chargeUser(userId, skill.price, 'skill_purchase', { skill_id: skillId })
        
        // Credit developer
        if (skill.author_id) {
          this.db.prepare(`
            INSERT INTO dev_payouts (id, developer_id, skill_id, amount)
            VALUES (?, ?, ?, ?)
          `).run(uuid(), skill.author_id, skillId, Math.floor(skill.price * 0.8)) // 80% to dev
        }
      }

      // Install skill
      this.db.prepare(`
        INSERT OR IGNORE INTO user_skills (user_id, skill_id)
        VALUES (?, ?)
      `).run(userId, skillId)

      // Increment installs
      this.db.prepare('UPDATE skills SET installs = installs + 1 WHERE id = ?').run(skillId)
    })

    txn()
    return true
  }

  getUserSkills(userId: string): Skill[] {
    const stmt = this.db.prepare(`
      SELECT s.* FROM skills s
      JOIN user_skills us ON s.id = us.skill_id
      WHERE us.user_id = ?
    `)
    const rows = stmt.all(userId) as any[]
    return rows.map(row => ({ ...row, tags: JSON.parse(row.tags || '[]') }))
  }

  // Close database
  close(): void {
    this.db.close()
  }
}

// Singleton instance
let dbInstance: OnionDB | null = null

export function getDB(): OnionDB {
  if (!dbInstance) {
    dbInstance = new OnionDB()
  }
  return dbInstance
}
