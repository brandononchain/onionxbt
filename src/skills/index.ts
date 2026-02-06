/**
 * OnionXBT Skills Registry
 * Load and manage all available skills
 */

import torBrowser from './tor-browser/index.js'
import btcOracle from './btc-oracle/index.js'
import codeExecutor from './code-executor/index.js'
import xAutomation from './x-automation/index.js'
import osintToolkit from './osint-toolkit/index.js'
import nostrClient from './nostr-client/index.js'
import aiImageGen from './ai-image-gen/index.js'

export interface Skill {
  name: string
  description: string
  icon: string
  price: number
  version: string
  author: string
  tags: string[]
  tools: Array<{
    name: string
    description: string
    parameters: object
    execute: (params: any) => Promise<any>
  }>
}

// All built-in skills
export const BUILTIN_SKILLS: Skill[] = [
  torBrowser,
  btcOracle,
  codeExecutor,
  xAutomation,
  osintToolkit,
  nostrClient,
  aiImageGen,
]

// Skill registry (built-in + user-installed)
const skillRegistry: Map<string, Skill> = new Map()

// Initialize with built-in skills
for (const skill of BUILTIN_SKILLS) {
  skillRegistry.set(skill.name.toLowerCase(), skill)
}

/**
 * Get a skill by name
 */
export function getSkill(name: string): Skill | undefined {
  return skillRegistry.get(name.toLowerCase())
}

/**
 * Get all available skills
 */
export function getAllSkills(): Skill[] {
  return Array.from(skillRegistry.values())
}

/**
 * Get skills matching a filter
 */
export function filterSkills(options: {
  free?: boolean
  paid?: boolean
  search?: string
  tags?: string[]
}): Skill[] {
  let skills = getAllSkills()

  if (options.free) {
    skills = skills.filter(s => s.price === 0)
  }

  if (options.paid) {
    skills = skills.filter(s => s.price > 0)
  }

  if (options.search) {
    const query = options.search.toLowerCase()
    skills = skills.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.tags.some(t => t.toLowerCase().includes(query))
    )
  }

  if (options.tags?.length) {
    skills = skills.filter(s =>
      options.tags!.some(tag => s.tags.includes(tag.toLowerCase()))
    )
  }

  return skills
}

/**
 * Register a custom skill
 */
export function registerSkill(skill: Skill): void {
  skillRegistry.set(skill.name.toLowerCase(), skill)
}

/**
 * Get all tools from a skill
 */
export function getSkillTools(skillName: string): Skill['tools'] {
  const skill = getSkill(skillName)
  return skill?.tools || []
}

/**
 * Execute a tool from a skill
 */
export async function executeSkillTool(
  skillName: string,
  toolName: string,
  params: any
): Promise<any> {
  const skill = getSkill(skillName)
  if (!skill) {
    return { error: `Skill not found: ${skillName}` }
  }

  const tool = skill.tools.find(t => t.name === toolName)
  if (!tool) {
    return { error: `Tool not found: ${toolName} in skill ${skillName}` }
  }

  try {
    return await tool.execute(params)
  } catch (err: any) {
    return { error: err.message || 'Tool execution failed' }
  }
}

/**
 * Get skill metadata for marketplace display
 */
export function getSkillMetadata(): Array<{
  name: string
  description: string
  icon: string
  price: number
  version: string
  author: string
  tags: string[]
  toolCount: number
}> {
  return getAllSkills().map(s => ({
    name: s.name,
    description: s.description,
    icon: s.icon,
    price: s.price,
    version: s.version,
    author: s.author,
    tags: s.tags,
    toolCount: s.tools.length,
  }))
}

export default {
  getSkill,
  getAllSkills,
  filterSkills,
  registerSkill,
  getSkillTools,
  executeSkillTool,
  getSkillMetadata,
  BUILTIN_SKILLS,
}
