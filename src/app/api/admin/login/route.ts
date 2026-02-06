import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'onionxbt-admin-2024'

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// In production, use a proper session store
const activeSessions = new Map<string, { createdAt: number }>()

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    
    const token = generateToken()
    activeSessions.set(token, { createdAt: Date.now() })
    
    // Clean old sessions (older than 24h)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    for (const [t, session] of activeSessions) {
      if (session.createdAt < dayAgo) {
        activeSessions.delete(t)
      }
    }
    
    return NextResponse.json({ token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export { activeSessions }
