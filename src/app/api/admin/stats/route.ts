import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { activeSessions } from '../login/route'

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return !!token && activeSessions.has(token)
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const db = getDB()
    
    // Get user stats
    const userStats = db.db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN last_seen > datetime('now', '-24 hours') THEN 1 ELSE 0 END) as active_users
      FROM users
    `).get() as any
    
    // Get revenue stats
    const revenueStats = db.db.prepare(`
      SELECT 
        COALESCE(SUM(cost), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN created_at > datetime('now', '-24 hours') THEN cost ELSE 0 END), 0) as today_revenue
      FROM usage
    `).get() as any
    
    // Get message stats
    const messageStats = db.db.prepare(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 ELSE 0 END) as today_messages
      FROM usage WHERE type = 'message'
    `).get() as any
    
    // Get payment stats
    const paymentStats = db.db.prepare(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments
      FROM payments
    `).get() as any
    
    // Get skill stats
    const skillStats = db.db.prepare(`
      SELECT COALESCE(SUM(installs), 0) as skill_installs FROM skills
    `).get() as any
    
    // Get affiliate stats
    const affiliateStats = db.db.prepare(`
      SELECT COALESCE(SUM(total_earnings), 0) as affiliate_earnings FROM affiliates
    `).get() as any || { affiliate_earnings: 0 }
    
    return NextResponse.json({
      totalUsers: userStats?.total_users || 0,
      activeUsers: userStats?.active_users || 0,
      totalRevenue: revenueStats?.total_revenue || 0,
      todayRevenue: revenueStats?.today_revenue || 0,
      totalMessages: messageStats?.total_messages || 0,
      todayMessages: messageStats?.today_messages || 0,
      totalPayments: paymentStats?.total_payments || 0,
      pendingPayments: paymentStats?.pending_payments || 0,
      skillInstalls: skillStats?.skill_installs || 0,
      affiliateEarnings: affiliateStats?.affiliate_earnings || 0,
    })
  } catch (err: any) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
