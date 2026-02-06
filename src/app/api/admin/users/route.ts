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
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'
    const sort = searchParams.get('sort') || 'created'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    
    const db = getDB()
    
    // Build query
    let whereClause = '1=1'
    if (filter === 'active') {
      whereClause = "last_seen > datetime('now', '-7 days')"
    } else if (filter === 'inactive') {
      whereClause = "last_seen < datetime('now', '-7 days') OR last_seen IS NULL"
    } else if (filter === 'banned') {
      whereClause = "status = 'banned'"
    }
    
    let orderClause = 'created_at DESC'
    if (sort === 'balance') orderClause = 'balance DESC'
    if (sort === 'spent') orderClause = 'total_spent DESC'
    if (sort === 'messages') orderClause = 'message_count DESC'
    
    // Get users with stats
    const users = db.db.prepare(`
      SELECT 
        u.*,
        COALESCE((SELECT COUNT(*) FROM usage WHERE user_id = u.id AND type = 'message'), 0) as message_count,
        COALESCE((SELECT COUNT(*) FROM user_skills WHERE user_id = u.id), 0) as skills_installed,
        (SELECT referral_code FROM affiliates WHERE user_id = u.id) as referral_code,
        (SELECT a2.referral_code FROM referrals r JOIN affiliates a2 ON r.affiliate_id = a2.id WHERE r.referred_user_id = u.id) as referred_by,
        COALESCE(u.status, 'active') as status
      FROM users u
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[]
    
    // Get total count
    const total = db.db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE ${whereClause}
    `).get() as any
    
    return NextResponse.json({
      users,
      total: total.count,
      page,
      totalPages: Math.ceil(total.count / limit)
    })
  } catch (err: any) {
    console.error('Users error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
