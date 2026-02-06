/**
 * OnionXBT Standalone API Server
 * Express-based API for external integrations
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import { OnionAgent } from '../agent/core.js'
import { getDB } from '../lib/db/index.js'
import { OnionWallet } from '../lib/btc/wallet.js'
import { LightningClient } from '../lib/btc/lightning.js'
import { getAllSkills, executeSkillTool } from '../skills/index.js'
import { generateQRSvg, generateLightningQR, generateBitcoinQR } from '../lib/qr/generator.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// API Key authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' })
  }

  // Validate API key against database
  const db = getDB()
  const key = db.db.prepare('SELECT * FROM api_keys WHERE key = ? AND active = 1').get(apiKey) as any
  
  if (!key) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  // Attach user to request
  ;(req as any).userId = key.user_id
  ;(req as any).apiKeyId = key.id
  ;(req as any).rateLimit = key.rate_limit || 100
  
  next()
}

// Rate limiting middleware
const rateLimits = new Map<string, { count: number; resetAt: number }>()

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  const keyId = (req as any).apiKeyId
  const limit = (req as any).rateLimit
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window

  let entry = rateLimits.get(keyId)
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    rateLimits.set(keyId, entry)
  }

  entry.count++
  
  res.setHeader('X-RateLimit-Limit', limit)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - entry.count))
  res.setHeader('X-RateLimit-Reset', entry.resetAt)

  if (entry.count > limit) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    })
  }

  next()
}

// Singleton agent
let agent: OnionAgent | null = null
function getAgent(): OnionAgent {
  if (!agent) {
    agent = new OnionAgent({
      provider: (process.env.AGENT_PROVIDER as any) || 'anthropic',
      model: process.env.AGENT_MODEL || 'claude-sonnet-4-20250514',
      apiKey: process.env.AGENT_API_KEY!,
    })
  }
  return agent
}

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() })
})

app.get('/v1/skills', (req, res) => {
  const skills = getAllSkills().map(s => ({
    name: s.name,
    description: s.description,
    icon: s.icon,
    price: s.price,
    version: s.version,
    author: s.author,
    tags: s.tags,
    tools: s.tools.map(t => ({ name: t.name, description: t.description }))
  }))
  res.json({ skills })
})

app.get('/v1/pricing', (req, res) => {
  res.json({
    currency: 'sats',
    rates: {
      message_base: 50,
      message_per_1k_tokens: 10,
      tool_call: 50,
      tor_request: 100,
      x_action: 150,
      skill_usage: 'varies by skill'
    },
    minimumDeposit: 1000,
    note: 'Prices in satoshis (1 BTC = 100,000,000 sats)'
  })
})

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// Chat endpoint
app.post('/v1/chat', authenticate, rateLimit, async (req, res) => {
  try {
    const { messages, stream = false } = req.body
    const userId = (req as any).userId

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' })
    }

    const db = getDB()
    const user = db.getUser(userId)

    if (!user || user.balance < 50) {
      return res.status(402).json({ 
        error: 'Insufficient balance',
        balance: user?.balance || 0,
        minimumRequired: 50
      })
    }

    const onionAgent = getAgent()
    const response = await onionAgent.chat(userId, messages)

    const updatedUser = db.getUser(userId)

    res.json({
      id: randomUUID(),
      object: 'chat.completion',
      created: Date.now(),
      content: response.content,
      tool_calls: response.toolCalls,
      usage: {
        cost_sats: response.cost,
        balance_remaining: updatedUser?.balance || 0
      }
    })
  } catch (err: any) {
    console.error('Chat error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Execute skill tool directly
app.post('/v1/skills/:skill/tools/:tool', authenticate, rateLimit, async (req, res) => {
  try {
    const { skill, tool } = req.params
    const params = req.body

    const result = await executeSkillTool(skill, tool, params)
    
    res.json({
      skill,
      tool,
      result,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Create payment
app.post('/v1/payments', authenticate, async (req, res) => {
  try {
    const { type = 'lightning', amount } = req.body
    const userId = (req as any).userId

    if (!amount || amount < 1000) {
      return res.status(400).json({ error: 'Minimum amount is 1000 sats' })
    }

    const db = getDB()

    if (type === 'lightning') {
      const lightning = new LightningClient({
        provider: (process.env.LN_PROVIDER as any) || 'lnbits',
        endpoint: process.env.LN_ENDPOINT!,
        apiKey: process.env.LN_API_KEY,
      })

      const invoice = await lightning.createInvoice(amount, `OnionXBT deposit`)
      
      const payment = db.createPayment({
        user_id: userId,
        type: 'lightning',
        invoice: invoice.paymentRequest,
        payment_hash: invoice.paymentHash,
        amount,
      })

      const qr = generateLightningQR(invoice.paymentRequest)

      res.json({
        id: payment.id,
        type: 'lightning',
        invoice: invoice.paymentRequest,
        payment_hash: invoice.paymentHash,
        amount,
        qr_svg: qr,
        expires_at: invoice.expiresAt
      })
    } else {
      const wallet = new OnionWallet({
        network: (process.env.BTC_NETWORK as any) || 'mainnet',
        xpub: process.env.BTC_XPUB,
      })

      const { address, index } = wallet.deriveAddress()

      const payment = db.createPayment({
        user_id: userId,
        type: 'onchain',
        address,
        amount,
      })

      const qr = generateBitcoinQR(address, amount / 100000000)

      res.json({
        id: payment.id,
        type: 'onchain',
        address,
        amount,
        qr_svg: qr,
        confirmations_required: 1
      })
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Check payment status
app.get('/v1/payments/:id', authenticate, async (req, res) => {
  try {
    const db = getDB()
    const payment = db.getPayment(req.params.id)

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    res.json({
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      status: payment.status,
      created_at: payment.created_at,
      confirmed_at: payment.confirmed_at
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get user balance
app.get('/v1/balance', authenticate, async (req, res) => {
  try {
    const db = getDB()
    const user = db.getUser((req as any).userId)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      balance: user.balance,
      total_deposited: user.total_deposited,
      total_spent: user.total_spent,
      currency: 'sats'
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Usage history
app.get('/v1/usage', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const userId = (req as any).userId
    const db = getDB()

    const usage = db.db.prepare(`
      SELECT * FROM usage 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset)

    res.json({ usage })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

// BTCPay webhook
app.post('/webhooks/btcpay', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers['btcpay-sig']
    // TODO: Verify webhook signature
    
    const event = JSON.parse(req.body.toString())
    console.log('BTCPay webhook:', event.type)

    if (event.type === 'InvoiceSettled' || event.type === 'InvoicePaymentSettled') {
      const db = getDB()
      const payment = db.getPaymentByHash(event.invoiceId)
      
      if (payment && payment.status === 'pending') {
        db.confirmPayment(payment.id, event.txId)
        console.log(`Payment confirmed: ${payment.id}`)
        
        // Emit WebSocket event
        broadcastToUser(payment.user_id, {
          type: 'payment_confirmed',
          payment_id: payment.id,
          amount: payment.amount
        })
      }
    }

    res.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: err.message })
  }
})

// LNbits webhook
app.post('/webhooks/lnbits', async (req, res) => {
  try {
    const { payment_hash, checking_id, pending } = req.body
    console.log('LNbits webhook:', payment_hash, pending)

    if (!pending) {
      const db = getDB()
      const payment = db.getPaymentByHash(payment_hash)
      
      if (payment && payment.status === 'pending') {
        db.confirmPayment(payment.id)
        console.log(`Lightning payment confirmed: ${payment.id}`)
        
        broadcastToUser(payment.user_id, {
          type: 'payment_confirmed',
          payment_id: payment.id,
          amount: payment.amount
        })
      }
    }

    res.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Generic blockchain webhook (e.g., from BlockCypher, Blockchain.com)
app.post('/webhooks/blockchain', async (req, res) => {
  try {
    const { address, confirmations, value, tx_hash } = req.body
    console.log('Blockchain webhook:', address, confirmations)

    if (confirmations >= 1) {
      const db = getDB()
      const payment = db.db.prepare(
        'SELECT * FROM payments WHERE address = ? AND status = ?'
      ).get(address, 'pending') as any

      if (payment) {
        db.confirmPayment(payment.id, tx_hash)
        console.log(`On-chain payment confirmed: ${payment.id}`)
        
        broadcastToUser(payment.user_id, {
          type: 'payment_confirmed',
          payment_id: payment.id,
          amount: payment.amount
        })
      }
    }

    res.json({ received: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================
// WEBSOCKET SERVER
// ============================================

const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

// User connections map
const userConnections = new Map<string, Set<WebSocket>>()

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const apiKey = url.searchParams.get('api_key')

  if (!apiKey) {
    ws.close(4001, 'API key required')
    return
  }

  // Validate API key
  const db = getDB()
  const key = db.db.prepare('SELECT * FROM api_keys WHERE key = ? AND active = 1').get(apiKey) as any

  if (!key) {
    ws.close(4001, 'Invalid API key')
    return
  }

  const userId = key.user_id

  // Register connection
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set())
  }
  userConnections.get(userId)!.add(ws)

  console.log(`WebSocket connected: user ${userId}`)

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString())
      
      // Handle real-time chat
      if (message.type === 'chat') {
        const onionAgent = getAgent()
        const response = await onionAgent.chat(userId, message.messages)
        
        ws.send(JSON.stringify({
          type: 'chat_response',
          id: message.id,
          content: response.content,
          tool_calls: response.toolCalls,
          cost: response.cost
        }))
      }
    } catch (err: any) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }))
    }
  })

  ws.on('close', () => {
    userConnections.get(userId)?.delete(ws)
    if (userConnections.get(userId)?.size === 0) {
      userConnections.delete(userId)
    }
    console.log(`WebSocket disconnected: user ${userId}`)
  })

  // Send welcome message
  ws.send(JSON.stringify({ type: 'connected', user_id: userId }))
})

function broadcastToUser(userId: string, message: object) {
  const connections = userConnections.get(userId)
  if (connections) {
    const data = JSON.stringify(message)
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    }
  }
}

// ============================================
// SERVER STARTUP
// ============================================

export async function startServer(port: number = 3001, host: string = '0.0.0.0') {
  // Ensure API keys table exists
  const db = getDB()
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT UNIQUE NOT NULL,
      name TEXT,
      rate_limit INTEGER DEFAULT 100,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
  `)

  httpServer.listen(port, host, () => {
    console.log(`🧅 OnionXBT API server running on http://${host}:${port}`)
    console.log(`   WebSocket endpoint: ws://${host}:${port}/ws`)
    console.log(`   Webhook endpoints:`)
    console.log(`     - POST /webhooks/btcpay`)
    console.log(`     - POST /webhooks/lnbits`)
    console.log(`     - POST /webhooks/blockchain`)
  })

  return httpServer
}

export default app
