import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { randomUUID } from 'crypto'
import { activeSessions } from '../login/route'

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return !!token && activeSessions.has(token)
}

function generateAPIKey(): string {
  return 'oxbt_' + randomUUID().replace(/-/g, '')
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const db = getDB()
    
    const keys = db.db.prepare(`
      SELECT 
        ak.*,
        COALESCE((
          SELECT COUNT(*) 
          FROM webhook_logs 
          WHERE created_at > datetime('now', '-24 hours')
        ), 0) as request_count
      FROM api_keys ak
      ORDER BY created_at DESC
    `).all()
    
    return NextResponse.json({ keys })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const { userId, name, rateLimit } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    const db = getDB()
    const key = generateAPIKey()
    const id = randomUUID()
    
    db.db.prepare(`
      INSERT INTO api_keys (id, user_id, key, name, rate_limit)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, key, name || 'Unnamed', rateLimit || 100)
    
    return NextResponse.json({ id, key })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
