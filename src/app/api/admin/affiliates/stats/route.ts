import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { activeSessions } from '../../login/route'

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
    
    const stats = db.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM affiliates) as totalAffiliates,
        (SELECT COUNT(*) FROM referrals) as totalReferrals,
        (SELECT COALESCE(SUM(total_earnings), 0) FROM affiliates) as totalEarnings,
        (SELECT COALESCE(SUM(pending_earnings), 0) FROM affiliates) as pendingPayouts
    `).get() as any
    
    return NextResponse.json(stats || {
      totalAffiliates: 0,
      totalReferrals: 0,
      totalEarnings: 0,
      pendingPayouts: 0
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
