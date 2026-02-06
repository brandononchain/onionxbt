import { NextRequest, NextResponse } from 'next/server'
import { activeSessions } from '../login/route'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token || !activeSessions.has(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  return NextResponse.json({ valid: true })
}
