/**
 * Skills marketplace API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

// GET - List all skills
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const filter = searchParams.get('filter') // 'all', 'free', 'paid'
    const userId = searchParams.get('userId')

    const db = getDB()
    let skills = db.getAllSkills()

    // Apply filters
    if (filter === 'free') {
      skills = skills.filter(s => s.price === 0)
    } else if (filter === 'paid') {
      skills = skills.filter(s => s.price > 0)
    }

    if (search) {
      const q = search.toLowerCase()
      skills = skills.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Mark installed skills for user
    let installedIds: string[] = []
    if (userId) {
      const userSkills = db.getUserSkills(userId)
      installedIds = userSkills.map(s => s.id)
    }

    const skillsWithInstalled = skills.map(s => ({
      ...s,
      installed: installedIds.includes(s.id),
    }))

    return NextResponse.json({
      success: true,
      skills: skillsWithInstalled,
      total: skillsWithInstalled.length,
    })
  } catch (error: any) {
    console.error('Skills list failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list skills' },
      { status: 500 }
    )
  }
}

// POST - Create a new skill
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, authorId, icon, price, tags, codePath } = body

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description' },
        { status: 400 }
      )
    }

    const db = getDB()

    // Check if skill name already exists
    const existing = db.db.prepare('SELECT id FROM skills WHERE name = ?').get(name)
    if (existing) {
      return NextResponse.json(
        { error: 'Skill with this name already exists' },
        { status: 409 }
      )
    }

    const skill = db.createSkill({
      name,
      description,
      author_id: authorId || null,
      icon: icon || '🔧',
      price: price || 0,
      version: '1.0.0',
      tags: tags || [],
      code_path: codePath || '',
    })

    return NextResponse.json({
      success: true,
      skill,
    })
  } catch (error: any) {
    console.error('Skill creation failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create skill' },
      { status: 500 }
    )
  }
}
