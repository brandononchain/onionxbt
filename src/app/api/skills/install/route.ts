/**
 * Install skill endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, skillId } = body

    if (!userId || !skillId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, skillId' },
        { status: 400 }
      )
    }

    const db = getDB()

    // Get user and skill
    const user = db.getUser(userId)
    const skill = db.getSkill(skillId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }

    // Check if already installed
    const userSkills = db.getUserSkills(userId)
    if (userSkills.some(s => s.id === skillId)) {
      return NextResponse.json(
        { error: 'Skill already installed' },
        { status: 409 }
      )
    }

    // Check balance for paid skills
    if (skill.price > 0 && user.balance < skill.price) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          required: skill.price,
          balance: user.balance,
        },
        { status: 402 }
      )
    }

    // Install skill
    const success = db.installSkill(userId, skillId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to install skill' },
        { status: 500 }
      )
    }

    // Get updated user
    const updatedUser = db.getUser(userId)

    return NextResponse.json({
      success: true,
      skill: {
        ...skill,
        installed: true,
      },
      balance: updatedUser?.balance || 0,
      cost: skill.price,
    })
  } catch (error: any) {
    console.error('Skill install failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to install skill' },
      { status: 500 }
    )
  }
}
