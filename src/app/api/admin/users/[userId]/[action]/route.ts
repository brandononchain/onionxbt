import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { activeSessions } from '../../../login/route'

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return !!token && activeSessions.has(token)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; action: string }> }
) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { userId, action } = await params
  const db = getDB()
  
  try {
    switch (action) {
      case 'ban':
        db.db.prepare('UPDATE users SET status = ? WHERE id = ?').run('banned', userId)
        return NextResponse.json({ success: true, action: 'banned' })
      
      case 'unban':
        db.db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', userId)
        return NextResponse.json({ success: true, action: 'unbanned' })
      
      case 'credit': {
        const body = await req.json()
        const amount = body.amount
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }
        db.db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, userId)
        return NextResponse.json({ success: true, action: 'credited', amount })
      }
      
      case 'debit': {
        const body = await req.json()
        const amount = body.amount
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }
        db.db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?').run(amount, userId)
        return NextResponse.json({ success: true, action: 'debited', amount })
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('User action error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
