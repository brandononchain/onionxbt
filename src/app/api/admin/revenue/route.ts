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
    const range = searchParams.get('range') || '30d'
    
    let days = 30
    if (range === '7d') days = 7
    if (range === '90d') days = 90
    if (range === 'all') days = 365 * 10
    
    const db = getDB()
    
    // Get daily revenue data
    const dailyData = db.db.prepare(`
      SELECT 
        date(created_at) as date,
        SUM(cost) as revenue,
        SUM(cost * 0.05) as fees,
        0 as payouts
      FROM usage
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all() as any[]
    
    // Calculate net for each day
    const data = dailyData.map(d => ({
      ...d,
      net: d.revenue - d.payouts
    }))
    
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Revenue error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
