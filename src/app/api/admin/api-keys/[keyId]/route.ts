import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { activeSessions } from '../../login/route'

function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return !!token && activeSessions.has(token)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { keyId } = await params
  const db = getDB()
  
  try {
    const body = await req.json()
    
    if (body.active !== undefined) {
      db.db.prepare('UPDATE api_keys SET active = ? WHERE id = ?')
        .run(body.active ? 1 : 0, keyId)
    }
    
    if (body.rateLimit !== undefined) {
      db.db.prepare('UPDATE api_keys SET rate_limit = ? WHERE id = ?')
        .run(body.rateLimit, keyId)
    }
    
    if (body.name !== undefined) {
      db.db.prepare('UPDATE api_keys SET name = ? WHERE id = ?')
        .run(body.name, keyId)
    }
    
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { keyId } = await params
  const db = getDB()
  
  try {
    db.db.prepare('DELETE FROM api_keys WHERE id = ?').run(keyId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
