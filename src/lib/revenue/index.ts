/**
 * OnionXBT Revenue & Affiliate System
 * Track earnings, payouts, and affiliate commissions
 */

import { getDB } from '../db/index.js'
import { randomUUID } from 'crypto'

// ============================================
// Revenue Configuration
// ============================================

export const REVENUE_CONFIG = {
  // Platform fees (percentage)
  platformFee: 0.05,           // 5% of all transactions
  skillMarketplaceFee: 0.20,   // 20% of paid skill sales (80% to dev)
  
  // Affiliate program
  affiliateCommission: 0.10,   // 10% of referred user spend
  affiliateTier2: 0.02,        // 2% of tier-2 referrals
  
  // Minimum payouts
  minPayoutSats: 100000,       // 100k sats minimum withdrawal
  
  // Revenue sharing for API partners
  apiPartnerShare: 0.30,       // 30% of fees from their users
}

// ============================================
// Types
// ============================================

export interface RevenueEvent {
  id: string
  type: 'message' | 'skill_purchase' | 'skill_usage' | 'api_usage'
  userId: string
  amount: number          // Total sats spent
  platformFee: number     // Platform's cut
  developerPayout?: number
  developerId?: string
  affiliatePayout?: number
  affiliateId?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface AffiliateStats {
  affiliateId: string
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  tier2Referrals: number
  tier2Earnings: number
}

export interface DeveloperStats {
  developerId: string
  skills: number
  totalInstalls: number
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  topSkill?: {
    name: string
    installs: number
    earnings: number
  }
}

// ============================================
// Revenue Tracking
// ============================================

export class RevenueTracker {
  private db = getDB()

  constructor() {
    this.initTables()
  }

  private initTables() {
    this.db.db.exec(`
      -- Revenue events
      CREATE TABLE IF NOT EXISTS revenue_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        platform_fee INTEGER NOT NULL,
        developer_payout INTEGER,
        developer_id TEXT,
        affiliate_payout INTEGER,
        affiliate_id TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Affiliate relationships
      CREATE TABLE IF NOT EXISTS affiliates (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by TEXT,
        tier INTEGER DEFAULT 1,
        total_earnings INTEGER DEFAULT 0,
        pending_earnings INTEGER DEFAULT 0,
        paid_earnings INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (referred_by) REFERENCES affiliates(id)
      );

      -- Referrals
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        affiliate_id TEXT NOT NULL,
        referred_user_id TEXT NOT NULL,
        tier INTEGER DEFAULT 1,
        total_spend INTEGER DEFAULT 0,
        commission_earned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
        FOREIGN KEY (referred_user_id) REFERENCES users(id)
      );

      -- Payouts
      CREATE TABLE IF NOT EXISTS payouts (
        id TEXT PRIMARY KEY,
        recipient_id TEXT NOT NULL,
        recipient_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        btc_address TEXT,
        lightning_invoice TEXT,
        txid TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME
      );

      -- Developer earnings
      CREATE TABLE IF NOT EXISTS developer_earnings (
        id TEXT PRIMARY KEY,
        developer_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (developer_id) REFERENCES users(id),
        FOREIGN KEY (skill_id) REFERENCES skills(id)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_revenue_user ON revenue_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_revenue_type ON revenue_events(type);
      CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(referral_code);
      CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
    `)
  }

  /**
   * Record a revenue event and distribute earnings
   */
  recordRevenue(event: Omit<RevenueEvent, 'id' | 'createdAt' | 'platformFee'>): RevenueEvent {
    const id = randomUUID()
    const platformFee = Math.floor(event.amount * REVENUE_CONFIG.platformFee)
    
    let developerPayout = 0
    let affiliatePayout = 0
    let affiliateId: string | undefined

    // Calculate developer payout for skill purchases
    if (event.type === 'skill_purchase' && event.developerId) {
      developerPayout = Math.floor(event.amount * (1 - REVENUE_CONFIG.skillMarketplaceFee))
      
      // Credit developer
      this.db.db.prepare(`
        INSERT INTO developer_earnings (id, developer_id, skill_id, amount, type)
        VALUES (?, ?, ?, ?, 'skill_sale')
      `).run(randomUUID(), event.developerId, event.metadata?.skillId, developerPayout)
      
      // Update dev_payouts table
      this.db.db.prepare(`
        UPDATE dev_payouts 
        SET amount = amount + ? 
        WHERE developer_id = ? AND status = 'pending'
      `).run(developerPayout, event.developerId)
    }

    // Calculate affiliate commission
    const referral = this.db.db.prepare(`
      SELECT r.*, a.id as affiliate_id 
      FROM referrals r
      JOIN affiliates a ON r.affiliate_id = a.id
      WHERE r.referred_user_id = ?
    `).get(event.userId) as any

    if (referral) {
      affiliateId = referral.affiliate_id
      affiliatePayout = Math.floor(event.amount * REVENUE_CONFIG.affiliateCommission)
      
      // Update referral stats
      this.db.db.prepare(`
        UPDATE referrals 
        SET total_spend = total_spend + ?, commission_earned = commission_earned + ?
        WHERE id = ?
      `).run(event.amount, affiliatePayout, referral.id)
      
      // Credit affiliate
      this.db.db.prepare(`
        UPDATE affiliates 
        SET total_earnings = total_earnings + ?, pending_earnings = pending_earnings + ?
        WHERE id = ?
      `).run(affiliatePayout, affiliatePayout, affiliateId)

      // Tier 2 commission (if applicable)
      const affiliate = this.db.db.prepare(
        'SELECT referred_by FROM affiliates WHERE id = ?'
      ).get(affiliateId) as any

      if (affiliate?.referred_by) {
        const tier2Payout = Math.floor(event.amount * REVENUE_CONFIG.affiliateTier2)
        this.db.db.prepare(`
          UPDATE affiliates 
          SET total_earnings = total_earnings + ?, pending_earnings = pending_earnings + ?
          WHERE id = ?
        `).run(tier2Payout, tier2Payout, affiliate.referred_by)
      }
    }

    // Record the event
    this.db.db.prepare(`
      INSERT INTO revenue_events (
        id, type, user_id, amount, platform_fee, 
        developer_payout, developer_id, affiliate_payout, affiliate_id, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      event.type,
      event.userId,
      event.amount,
      platformFee,
      developerPayout || null,
      event.developerId || null,
      affiliatePayout || null,
      affiliateId || null,
      JSON.stringify(event.metadata || {})
    )

    return {
      id,
      ...event,
      platformFee,
      developerPayout: developerPayout || undefined,
      affiliatePayout: affiliatePayout || undefined,
      affiliateId,
      createdAt: new Date()
    }
  }

  // ============================================
  // Affiliate System
  // ============================================

  /**
   * Create an affiliate account for a user
   */
  createAffiliate(userId: string, referredBy?: string): string {
    const id = randomUUID()
    const referralCode = this.generateReferralCode()
    
    let referredById: string | undefined
    if (referredBy) {
      const referrer = this.db.db.prepare(
        'SELECT id FROM affiliates WHERE referral_code = ?'
      ).get(referredBy) as any
      referredById = referrer?.id
    }

    this.db.db.prepare(`
      INSERT INTO affiliates (id, user_id, referral_code, referred_by)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, referralCode, referredById)

    return referralCode
  }

  /**
   * Track a new referral
   */
  trackReferral(affiliateCode: string, newUserId: string): boolean {
    const affiliate = this.db.db.prepare(
      'SELECT id FROM affiliates WHERE referral_code = ?'
    ).get(affiliateCode) as any

    if (!affiliate) return false

    // Check if user already referred
    const existing = this.db.db.prepare(
      'SELECT id FROM referrals WHERE referred_user_id = ?'
    ).get(newUserId)

    if (existing) return false

    this.db.db.prepare(`
      INSERT INTO referrals (id, affiliate_id, referred_user_id)
      VALUES (?, ?, ?)
    `).run(randomUUID(), affiliate.id, newUserId)

    return true
  }

  /**
   * Get affiliate stats
   */
  getAffiliateStats(userId: string): AffiliateStats | null {
    const affiliate = this.db.db.prepare(
      'SELECT * FROM affiliates WHERE user_id = ?'
    ).get(userId) as any

    if (!affiliate) return null

    const referrals = this.db.db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN total_spend > 0 THEN 1 ELSE 0 END) as active
      FROM referrals WHERE affiliate_id = ?
    `).get(affiliate.id) as any

    const tier2 = this.db.db.prepare(`
      SELECT COUNT(*) as count, SUM(a2.total_earnings) as earnings
      FROM affiliates a1
      JOIN affiliates a2 ON a2.referred_by = a1.id
      WHERE a1.id = ?
    `).get(affiliate.id) as any

    return {
      affiliateId: affiliate.id,
      totalReferrals: referrals.total || 0,
      activeReferrals: referrals.active || 0,
      totalEarnings: affiliate.total_earnings || 0,
      pendingEarnings: affiliate.pending_earnings || 0,
      paidEarnings: affiliate.paid_earnings || 0,
      tier2Referrals: tier2.count || 0,
      tier2Earnings: tier2.earnings || 0
    }
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'ONION-'
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  // ============================================
  // Developer Earnings
  // ============================================

  /**
   * Get developer stats
   */
  getDeveloperStats(userId: string): DeveloperStats {
    const skills = this.db.db.prepare(`
      SELECT COUNT(*) as count, SUM(installs) as installs
      FROM skills WHERE author_id = ?
    `).get(userId) as any

    const earnings = this.db.db.prepare(`
      SELECT SUM(amount) as total
      FROM developer_earnings WHERE developer_id = ?
    `).get(userId) as any

    const payouts = this.db.db.prepare(`
      SELECT SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
             SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid
      FROM payouts WHERE recipient_id = ? AND recipient_type = 'developer'
    `).get(userId) as any

    const topSkill = this.db.db.prepare(`
      SELECT s.name, s.installs, COALESCE(SUM(de.amount), 0) as earnings
      FROM skills s
      LEFT JOIN developer_earnings de ON s.id = de.skill_id
      WHERE s.author_id = ?
      GROUP BY s.id
      ORDER BY earnings DESC
      LIMIT 1
    `).get(userId) as any

    return {
      developerId: userId,
      skills: skills.count || 0,
      totalInstalls: skills.installs || 0,
      totalEarnings: earnings.total || 0,
      pendingEarnings: payouts.pending || 0,
      paidEarnings: payouts.paid || 0,
      topSkill: topSkill ? {
        name: topSkill.name,
        installs: topSkill.installs,
        earnings: topSkill.earnings
      } : undefined
    }
  }

  // ============================================
  // Payouts
  // ============================================

  /**
   * Request a payout
   */
  requestPayout(
    recipientId: string,
    recipientType: 'affiliate' | 'developer',
    btcAddress?: string,
    lightningInvoice?: string
  ): string | null {
    // Get pending earnings
    let pendingAmount = 0
    
    if (recipientType === 'affiliate') {
      const affiliate = this.db.db.prepare(
        'SELECT pending_earnings FROM affiliates WHERE user_id = ?'
      ).get(recipientId) as any
      pendingAmount = affiliate?.pending_earnings || 0
    } else {
      const stats = this.getDeveloperStats(recipientId)
      pendingAmount = stats.pendingEarnings
    }

    if (pendingAmount < REVENUE_CONFIG.minPayoutSats) {
      return null // Below minimum
    }

    const payoutId = randomUUID()
    
    this.db.db.prepare(`
      INSERT INTO payouts (id, recipient_id, recipient_type, amount, btc_address, lightning_invoice)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(payoutId, recipientId, recipientType, pendingAmount, btcAddress, lightningInvoice)

    // Reset pending earnings
    if (recipientType === 'affiliate') {
      this.db.db.prepare(`
        UPDATE affiliates SET pending_earnings = 0 WHERE user_id = ?
      `).run(recipientId)
    }

    return payoutId
  }

  // ============================================
  // Analytics
  // ============================================

  /**
   * Get platform revenue summary
   */
  getRevenueSummary(days: number = 30): {
    totalRevenue: number
    platformFees: number
    developerPayouts: number
    affiliatePayouts: number
    transactionCount: number
  } {
    const summary = this.db.db.prepare(`
      SELECT 
        SUM(amount) as total_revenue,
        SUM(platform_fee) as platform_fees,
        SUM(COALESCE(developer_payout, 0)) as developer_payouts,
        SUM(COALESCE(affiliate_payout, 0)) as affiliate_payouts,
        COUNT(*) as transaction_count
      FROM revenue_events
      WHERE created_at >= datetime('now', '-${days} days')
    `).get() as any

    return {
      totalRevenue: summary.total_revenue || 0,
      platformFees: summary.platform_fees || 0,
      developerPayouts: summary.developer_payouts || 0,
      affiliatePayouts: summary.affiliate_payouts || 0,
      transactionCount: summary.transaction_count || 0
    }
  }
}

// Singleton
let revenueTracker: RevenueTracker | null = null

export function getRevenueTracker(): RevenueTracker {
  if (!revenueTracker) {
    revenueTracker = new RevenueTracker()
  }
  return revenueTracker
}

export default RevenueTracker
