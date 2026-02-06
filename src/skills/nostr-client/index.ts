/**
 * Nostr Client Skill
 * Decentralized social network protocol
 */

import { randomBytes, createHash } from 'crypto'
import WebSocket from 'ws'

// Nostr event kinds
const KIND = {
  METADATA: 0,
  TEXT_NOTE: 1,
  RECOMMEND_RELAY: 2,
  CONTACTS: 3,
  ENCRYPTED_DM: 4,
  DELETE: 5,
  REPOST: 6,
  REACTION: 7,
  ZAP_REQUEST: 9734,
  ZAP: 9735,
}

// Default relays
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
  'wss://relay.snort.social',
]

interface NostrEvent {
  id?: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig?: string
}

async function connectRelay(url: string, timeout = 5000): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error(`Connection timeout: ${url}`))
    }, timeout)
    
    ws.on('open', () => {
      clearTimeout(timer)
      resolve(ws)
    })
    
    ws.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function queryRelay(
  relay: string, 
  filter: any, 
  timeout = 10000
): Promise<NostrEvent[]> {
  const ws = await connectRelay(relay)
  const subId = randomBytes(8).toString('hex')
  const events: NostrEvent[] = []
  
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      ws.close()
      resolve(events)
    }, timeout)

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          events.push(msg[2])
        }
        if (msg[0] === 'EOSE' && msg[1] === subId) {
          clearTimeout(timer)
          ws.close()
          resolve(events)
        }
      } catch {}
    })

    ws.send(JSON.stringify(['REQ', subId, filter]))
  })
}

export default {
  name: 'NostrClient',
  description: 'Interact with the Nostr decentralized social network. Read notes, profiles, and explore the censorship-resistant protocol.',
  icon: '🟣',
  price: 0,
  version: '1.0.0',
  author: 'nostr_dev',
  tags: ['nostr', 'social', 'decentralized', 'protocol', 'censorship-resistant'],

  tools: [
    {
      name: 'nostr_profile',
      description: 'Get a Nostr user profile by pubkey or NIP-05',
      parameters: {
        type: 'object',
        properties: {
          pubkey: { type: 'string', description: 'Public key (hex) or NIP-05 identifier' }
        },
        required: ['pubkey']
      },
      execute: async (params: { pubkey: string }) => {
        let pubkey = params.pubkey
        
        // Handle NIP-05 (user@domain.com)
        if (pubkey.includes('@')) {
          const [name, domain] = pubkey.split('@')
          try {
            const response = await fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)
            const data = await response.json()
            pubkey = data.names?.[name]
            if (!pubkey) return { error: 'NIP-05 identifier not found' }
          } catch {
            return { error: 'Failed to resolve NIP-05' }
          }
        }

        // Query multiple relays for metadata
        const results = await Promise.all(
          DEFAULT_RELAYS.slice(0, 3).map(relay =>
            queryRelay(relay, { kinds: [KIND.METADATA], authors: [pubkey], limit: 1 })
              .catch(() => [])
          )
        )

        const events = results.flat()
        if (events.length === 0) {
          return { error: 'Profile not found', pubkey }
        }

        // Get most recent
        const latest = events.sort((a, b) => b.created_at - a.created_at)[0]
        
        try {
          const profile = JSON.parse(latest.content)
          return {
            pubkey,
            npub: `npub1${pubkey.slice(0, 59)}`, // Simplified
            profile: {
              name: profile.name,
              displayName: profile.display_name,
              about: profile.about,
              picture: profile.picture,
              banner: profile.banner,
              nip05: profile.nip05,
              lud16: profile.lud16, // Lightning address
              website: profile.website
            },
            updatedAt: new Date(latest.created_at * 1000).toISOString()
          }
        } catch {
          return { error: 'Failed to parse profile', pubkey }
        }
      }
    },
    {
      name: 'nostr_notes',
      description: 'Get recent notes from a user or global feed',
      parameters: {
        type: 'object',
        properties: {
          pubkey: { type: 'string', description: 'User pubkey (optional for global)' },
          limit: { type: 'number', description: 'Number of notes', default: 20 },
          hashtag: { type: 'string', description: 'Filter by hashtag' }
        }
      },
      execute: async (params: { pubkey?: string; limit?: number; hashtag?: string }) => {
        const filter: any = {
          kinds: [KIND.TEXT_NOTE],
          limit: params.limit || 20
        }

        if (params.pubkey) {
          filter.authors = [params.pubkey]
        }

        if (params.hashtag) {
          filter['#t'] = [params.hashtag.replace('#', '')]
        }

        const results = await Promise.all(
          DEFAULT_RELAYS.slice(0, 3).map(relay =>
            queryRelay(relay, filter).catch(() => [])
          )
        )

        // Deduplicate by event ID
        const seen = new Set<string>()
        const notes = results.flat()
          .filter(e => {
            if (!e.id || seen.has(e.id)) return false
            seen.add(e.id)
            return true
          })
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, params.limit || 20)

        return {
          count: notes.length,
          notes: notes.map(n => ({
            id: n.id,
            pubkey: n.pubkey,
            content: n.content.slice(0, 500),
            createdAt: new Date(n.created_at * 1000).toISOString(),
            hashtags: n.tags.filter(t => t[0] === 't').map(t => t[1]),
            mentions: n.tags.filter(t => t[0] === 'p').map(t => t[1])
          }))
        }
      }
    },
    {
      name: 'nostr_search',
      description: 'Search Nostr for notes containing text',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Number of results', default: 20 }
        },
        required: ['query']
      },
      execute: async (params: { query: string; limit?: number }) => {
        // Use nostr.band search API
        try {
          const response = await fetch(
            `https://api.nostr.band/v0/search?q=${encodeURIComponent(params.query)}&limit=${params.limit || 20}`
          )
          const data = await response.json()

          return {
            query: params.query,
            count: data.events?.length || 0,
            results: (data.events || []).map((e: NostrEvent) => ({
              id: e.id,
              pubkey: e.pubkey,
              content: e.content.slice(0, 300),
              createdAt: new Date(e.created_at * 1000).toISOString()
            }))
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'nostr_trending',
      description: 'Get trending notes and hashtags on Nostr',
      parameters: {
        type: 'object',
        properties: {
          type: { 
            type: 'string', 
            enum: ['notes', 'hashtags', 'profiles'],
            default: 'notes'
          }
        }
      },
      execute: async (params: { type?: string }) => {
        try {
          const endpoint = params.type === 'hashtags' 
            ? 'https://api.nostr.band/v0/trending/hashtags'
            : params.type === 'profiles'
            ? 'https://api.nostr.band/v0/trending/profiles'
            : 'https://api.nostr.band/v0/trending/notes'

          const response = await fetch(endpoint)
          const data = await response.json()

          if (params.type === 'hashtags') {
            return {
              type: 'hashtags',
              trending: (data.hashtags || []).slice(0, 20).map((h: any) => ({
                tag: h.hashtag,
                count: h.count
              }))
            }
          }

          if (params.type === 'profiles') {
            return {
              type: 'profiles',
              trending: (data.profiles || []).slice(0, 20).map((p: any) => ({
                pubkey: p.pubkey,
                name: p.profile?.name,
                followers: p.followers
              }))
            }
          }

          return {
            type: 'notes',
            trending: (data.notes || []).slice(0, 20).map((n: NostrEvent) => ({
              id: n.id,
              pubkey: n.pubkey,
              content: n.content.slice(0, 200),
              createdAt: new Date(n.created_at * 1000).toISOString()
            }))
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'nostr_relays',
      description: 'Get info about Nostr relays',
      parameters: {
        type: 'object',
        properties: {
          check: { type: 'boolean', description: 'Check relay connectivity' }
        }
      },
      execute: async (params: { check?: boolean }) => {
        if (params.check) {
          const checks = await Promise.all(
            DEFAULT_RELAYS.map(async (url) => {
              const start = Date.now()
              try {
                const ws = await connectRelay(url, 3000)
                ws.close()
                return { url, status: 'online', latencyMs: Date.now() - start }
              } catch {
                return { url, status: 'offline', latencyMs: null }
              }
            })
          )
          
          return {
            relays: checks,
            online: checks.filter(r => r.status === 'online').length,
            offline: checks.filter(r => r.status === 'offline').length
          }
        }

        return {
          defaultRelays: DEFAULT_RELAYS,
          popularRelays: [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.nostr.band',
            'wss://nostr.wine',
            'wss://relay.snort.social',
            'wss://eden.nostr.land',
            'wss://nostr.fmt.wiz.biz',
            'wss://relay.current.fyi'
          ]
        }
      }
    }
  ]
}
