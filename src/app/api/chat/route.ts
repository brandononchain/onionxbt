/**
 * Chat endpoint - main agent interaction
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { OnionAgent } from '@/agent/core'

// Singleton agent instance
let agent: OnionAgent | null = null

function getAgent(): OnionAgent {
  if (!agent) {
    agent = new OnionAgent({
      provider: (process.env.AGENT_PROVIDER as any) || 'anthropic',
      model: process.env.AGENT_MODEL || 'claude-sonnet-4-20250514',
      apiKey: process.env.AGENT_API_KEY!,
    })
  }
  return agent
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, messages } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid messages array' },
        { status: 400 }
      )
    }

    const db = getDB()
    const user = db.getUser(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please fund your account first.' },
        { status: 404 }
      )
    }

    // Check minimum balance
    if (user.balance < 50) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          balance: user.balance,
          minimumRequired: 50,
        },
        { status: 402 } // Payment Required
      )
    }

    const onionAgent = getAgent()
    
    // Chat with the agent
    const response = await onionAgent.chat(userId, messages)

    // Get updated balance
    const updatedUser = db.getUser(userId)

    return NextResponse.json({
      success: true,
      content: response.content,
      toolCalls: response.toolCalls,
      cost: response.cost,
      balance: updatedUser?.balance || 0,
    })
  } catch (error: any) {
    console.error('Chat failed:', error)
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}
