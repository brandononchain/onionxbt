'use client'

import { useState } from 'react'

interface Skill {
  id: string
  name: string
  description: string
  author: string
  price: number // 0 = free, otherwise sats
  installs: number
  rating: number
  tags: string[]
  icon: string
}

const mockSkills: Skill[] = [
  {
    id: '1',
    name: 'TorBrowser',
    description: 'Browse .onion sites and the dark web safely. Includes circuit management and identity rotation.',
    author: 'onionxbt',
    price: 0,
    installs: 1247,
    rating: 4.9,
    tags: ['tor', 'privacy', 'browsing'],
    icon: '🧅',
  },
  {
    id: '2',
    name: 'BTCPriceOracle',
    description: 'Real-time Bitcoin price tracking with alerts, technical analysis, and market sentiment.',
    author: 'satoshi_dev',
    price: 5000,
    installs: 892,
    rating: 4.7,
    tags: ['bitcoin', 'trading', 'alerts'],
    icon: '📈',
  },
  {
    id: '3',
    name: 'CodeExecutor',
    description: 'Run Python, JavaScript, Bash, and more. No sandboxing - full system access.',
    author: 'onionxbt',
    price: 0,
    installs: 2341,
    rating: 4.8,
    tags: ['code', 'execution', 'automation'],
    icon: '💻',
  },
  {
    id: '4',
    name: 'XAutomation',
    description: 'Automate Twitter/X interactions. Schedule posts, auto-reply, sentiment analysis.',
    author: 'social_wizard',
    price: 10000,
    installs: 567,
    rating: 4.5,
    tags: ['twitter', 'social', 'automation'],
    icon: '🐦',
  },
  {
    id: '5',
    name: 'OSINT Toolkit',
    description: 'Open source intelligence gathering. Username search, email lookup, domain analysis.',
    author: 'intel_master',
    price: 25000,
    installs: 234,
    rating: 4.9,
    tags: ['osint', 'research', 'intelligence'],
    icon: '🔍',
  },
  {
    id: '6',
    name: 'Mempool Monitor',
    description: 'Track Bitcoin mempool, fee estimation, transaction monitoring, and whale alerts.',
    author: 'blockhead',
    price: 0,
    installs: 1823,
    rating: 4.6,
    tags: ['bitcoin', 'mempool', 'monitoring'],
    icon: '⛏️',
  },
  {
    id: '7',
    name: 'AI Image Gen',
    description: 'Generate images with various AI models. No content filters applied.',
    author: 'pixel_punk',
    price: 15000,
    installs: 445,
    rating: 4.4,
    tags: ['ai', 'images', 'generation'],
    icon: '🎨',
  },
  {
    id: '8',
    name: 'Nostr Client',
    description: 'Full Nostr protocol support. Post, read, and interact with the decentralized social network.',
    author: 'nostr_dev',
    price: 0,
    installs: 678,
    rating: 4.7,
    tags: ['nostr', 'social', 'decentralized'],
    icon: '🟣',
  },
]

export function SkillsMarketplace() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [installedSkills, setInstalledSkills] = useState<string[]>(['1', '3'])

  const filteredSkills = mockSkills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter =
      filter === 'all' ||
      (filter === 'free' && skill.price === 0) ||
      (filter === 'paid' && skill.price > 0)

    return matchesSearch && matchesFilter
  })

  const installSkill = (skillId: string) => {
    setInstalledSkills((prev) => [...prev, skillId])
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Skills Marketplace</h2>
        <p className="text-gray-400">Extend OnionXBT with community-created skills</p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full bg-btc-dark-gray border border-btc-medium-gray rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'free', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-3 rounded-xl font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-btc-orange text-btc-black'
                  : 'bg-btc-dark-gray text-gray-400 hover:text-white border border-btc-medium-gray'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Create skill CTA */}
      <div className="bg-gradient-to-r from-btc-orange/20 to-btc-orange/5 rounded-2xl p-6 mb-8 border border-btc-orange/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Create Your Own Skill</h3>
            <p className="text-gray-400">Build skills and earn BTC when others use them</p>
          </div>
          <button className="bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold px-6 py-3 rounded-xl transition-all">
            Start Building
          </button>
        </div>
      </div>

      {/* Skills grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            isInstalled={installedSkills.includes(skill.id)}
            onInstall={() => installSkill(skill.id)}
          />
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No skills found matching your criteria</p>
        </div>
      )}
    </div>
  )
}

function SkillCard({
  skill,
  isInstalled,
  onInstall,
}: {
  skill: Skill
  isInstalled: boolean
  onInstall: () => void
}) {
  return (
    <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray hover:border-btc-orange/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-btc-medium-gray rounded-xl flex items-center justify-center">
            <span className="text-2xl">{skill.icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-white">{skill.name}</h3>
            <p className="text-sm text-gray-500">by {skill.author}</p>
          </div>
        </div>
        {skill.price === 0 ? (
          <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
            FREE
          </span>
        ) : (
          <span className="bg-btc-orange/20 text-btc-orange text-xs font-bold px-2 py-1 rounded-full">
            {skill.price.toLocaleString()} sats
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{skill.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {skill.tags.map((tag) => (
          <span
            key={tag}
            className="bg-btc-medium-gray text-gray-400 text-xs px-2 py-1 rounded-full"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>⬇️ {skill.installs.toLocaleString()}</span>
        <span>⭐ {skill.rating}</span>
      </div>

      {/* Action button */}
      {isInstalled ? (
        <button
          disabled
          className="w-full bg-green-500/20 text-green-400 font-bold py-3 rounded-xl"
        >
          ✓ Installed
        </button>
      ) : (
        <button
          onClick={onInstall}
          className="w-full bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold py-3 rounded-xl transition-all"
        >
          {skill.price === 0 ? 'Install' : `Buy for ${skill.price.toLocaleString()} sats`}
        </button>
      )}
    </div>
  )
}
