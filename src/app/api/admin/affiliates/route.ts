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
    
    const affiliates = db.db.prepare(`
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id) as total_referrals,
        (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id AND total_spend > 0) as active_referrals
      FROM affiliates a
      ORDER BY total_earnings DESC
    `).all()
    
    return NextResponse.json({ affiliates })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
