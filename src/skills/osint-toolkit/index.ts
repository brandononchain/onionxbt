/**
 * OSINT Toolkit Skill
 * Open Source Intelligence gathering
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default {
  name: 'OSINTToolkit',
  description: 'Open source intelligence gathering. Username search, email lookup, domain analysis, IP geolocation, and more.',
  icon: '🔍',
  price: 25000, // 25k sats
  version: '1.0.0',
  author: 'intel_master',
  tags: ['osint', 'research', 'intelligence', 'investigation', 'security'],

  tools: [
    {
      name: 'osint_username',
      description: 'Search for a username across multiple platforms',
      parameters: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Username to search' },
          platforms: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific platforms to check (optional)'
          }
        },
        required: ['username']
      },
      execute: async (params: { username: string; platforms?: string[] }) => {
        const username = params.username.replace(/[^a-zA-Z0-9_-]/g, '')
        
        const defaultPlatforms = [
          { name: 'Twitter/X', url: `https://x.com/${username}` },
          { name: 'GitHub', url: `https://github.com/${username}` },
          { name: 'Reddit', url: `https://reddit.com/user/${username}` },
          { name: 'Instagram', url: `https://instagram.com/${username}` },
          { name: 'TikTok', url: `https://tiktok.com/@${username}` },
          { name: 'YouTube', url: `https://youtube.com/@${username}` },
          { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` },
          { name: 'Telegram', url: `https://t.me/${username}` },
          { name: 'Keybase', url: `https://keybase.io/${username}` },
          { name: 'Medium', url: `https://medium.com/@${username}` },
          { name: 'HackerNews', url: `https://news.ycombinator.com/user?id=${username}` },
          { name: 'ProductHunt', url: `https://producthunt.com/@${username}` },
        ]

        const results = await Promise.all(
          defaultPlatforms.map(async (p) => {
            try {
              const response = await fetch(p.url, { 
                method: 'HEAD',
                redirect: 'manual'
              })
              const exists = response.status === 200 || response.status === 301
              return { platform: p.name, url: p.url, exists, status: response.status }
            } catch {
              return { platform: p.name, url: p.url, exists: false, status: 0 }
            }
          })
        )

        const found = results.filter(r => r.exists)
        
        return {
          username,
          found: found.length,
          total: results.length,
          profiles: found,
          notFound: results.filter(r => !r.exists).map(r => r.platform)
        }
      }
    },
    {
      name: 'osint_email',
      description: 'Analyze an email address for associated data',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Email address to analyze' }
        },
        required: ['email']
      },
      execute: async (params: { email: string }) => {
        const email = params.email.toLowerCase().trim()
        const [local, domain] = email.split('@')
        
        if (!domain) {
          return { error: 'Invalid email format' }
        }

        // Check Gravatar
        const crypto = await import('crypto')
        const hash = crypto.createHash('md5').update(email).digest('hex')
        const gravatarUrl = `https://gravatar.com/avatar/${hash}?d=404`
        
        let hasGravatar = false
        try {
          const gravResponse = await fetch(gravatarUrl)
          hasGravatar = gravResponse.status === 200
        } catch {}

        // Domain analysis
        let domainInfo: any = {}
        try {
          const { stdout } = await execAsync(`dig +short MX ${domain}`)
          domainInfo.mxRecords = stdout.trim().split('\n').filter(Boolean)
        } catch {}

        // Check common providers
        const providers: Record<string, string> = {
          'gmail.com': 'Google',
          'googlemail.com': 'Google',
          'outlook.com': 'Microsoft',
          'hotmail.com': 'Microsoft',
          'live.com': 'Microsoft',
          'yahoo.com': 'Yahoo',
          'protonmail.com': 'ProtonMail',
          'proton.me': 'ProtonMail',
          'icloud.com': 'Apple',
          'me.com': 'Apple'
        }

        return {
          email,
          local,
          domain,
          provider: providers[domain] || 'Custom/Unknown',
          hasGravatar,
          gravatarUrl: hasGravatar ? `https://gravatar.com/${hash}` : null,
          domainInfo,
          suggestions: [
            `Try searching for "${local}" as a username`,
            `Check ${domain} for company info`,
            hasGravatar ? 'Gravatar profile may have additional info' : null
          ].filter(Boolean)
        }
      }
    },
    {
      name: 'osint_domain',
      description: 'Analyze a domain for technical and ownership info',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domain to analyze' }
        },
        required: ['domain']
      },
      execute: async (params: { domain: string }) => {
        const domain = params.domain.replace(/^https?:\/\//, '').split('/')[0]
        
        const results: any = { domain }

        // DNS records
        try {
          const [aRecords, mxRecords, txtRecords, nsRecords] = await Promise.all([
            execAsync(`dig +short A ${domain}`).then(r => r.stdout.trim().split('\n').filter(Boolean)),
            execAsync(`dig +short MX ${domain}`).then(r => r.stdout.trim().split('\n').filter(Boolean)),
            execAsync(`dig +short TXT ${domain}`).then(r => r.stdout.trim().split('\n').filter(Boolean)),
            execAsync(`dig +short NS ${domain}`).then(r => r.stdout.trim().split('\n').filter(Boolean)),
          ])
          
          results.dns = { a: aRecords, mx: mxRecords, txt: txtRecords, ns: nsRecords }
        } catch {
          results.dns = { error: 'DNS lookup failed' }
        }

        // HTTP headers
        try {
          const response = await fetch(`https://${domain}`, { method: 'HEAD' })
          results.http = {
            status: response.status,
            server: response.headers.get('server'),
            poweredBy: response.headers.get('x-powered-by'),
            contentType: response.headers.get('content-type'),
          }
        } catch {
          results.http = { error: 'HTTP request failed' }
        }

        // SSL cert info
        try {
          const { stdout } = await execAsync(
            `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -dates -subject -issuer`
          )
          const lines = stdout.trim().split('\n')
          results.ssl = {}
          for (const line of lines) {
            if (line.startsWith('notBefore=')) results.ssl.validFrom = line.split('=')[1]
            if (line.startsWith('notAfter=')) results.ssl.validTo = line.split('=')[1]
            if (line.startsWith('subject=')) results.ssl.subject = line.split('=').slice(1).join('=')
            if (line.startsWith('issuer=')) results.ssl.issuer = line.split('=').slice(1).join('=')
          }
        } catch {
          results.ssl = { error: 'SSL check failed' }
        }

        // Technology detection hints
        const techHints: string[] = []
        if (results.dns?.txt?.some((t: string) => t.includes('google-site-verification'))) {
          techHints.push('Google Search Console verified')
        }
        if (results.dns?.txt?.some((t: string) => t.includes('v=spf1'))) {
          techHints.push('SPF email authentication')
        }
        if (results.dns?.mx?.some((m: string) => m.includes('google'))) {
          techHints.push('Google Workspace email')
        }
        if (results.http?.server?.toLowerCase().includes('cloudflare')) {
          techHints.push('Cloudflare CDN/Protection')
        }
        
        results.techHints = techHints

        return results
      }
    },
    {
      name: 'osint_ip',
      description: 'Get geolocation and details for an IP address',
      parameters: {
        type: 'object',
        properties: {
          ip: { type: 'string', description: 'IP address to lookup' }
        },
        required: ['ip']
      },
      execute: async (params: { ip: string }) => {
        try {
          const response = await fetch(`http://ip-api.com/json/${params.ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`)
          const data = await response.json()
          
          if (data.status === 'fail') {
            return { error: data.message }
          }

          return {
            ip: params.ip,
            location: {
              country: data.country,
              countryCode: data.countryCode,
              region: data.regionName,
              city: data.city,
              zip: data.zip,
              lat: data.lat,
              lon: data.lon,
              timezone: data.timezone
            },
            network: {
              isp: data.isp,
              org: data.org,
              as: data.as
            },
            flags: {
              mobile: data.mobile,
              proxy: data.proxy,
              hosting: data.hosting
            },
            mapUrl: `https://www.google.com/maps?q=${data.lat},${data.lon}`
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'osint_bitcoin_address',
      description: 'Analyze a Bitcoin address for transaction history',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address to analyze' }
        },
        required: ['address']
      },
      execute: async (params: { address: string }) => {
        try {
          const response = await fetch(`https://mempool.space/api/address/${params.address}`)
          
          if (!response.ok) {
            return { error: 'Invalid address or API error' }
          }
          
          const data = await response.json()
          
          // Get recent transactions
          const txResponse = await fetch(`https://mempool.space/api/address/${params.address}/txs`)
          const txs = await txResponse.json()
          
          return {
            address: params.address,
            type: params.address.startsWith('bc1') ? 'Bech32 (SegWit)' : 
                  params.address.startsWith('3') ? 'P2SH' : 'Legacy',
            stats: {
              totalReceived: data.chain_stats.funded_txo_sum / 100000000,
              totalSent: data.chain_stats.spent_txo_sum / 100000000,
              balance: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000,
              txCount: data.chain_stats.tx_count
            },
            recentTxs: txs.slice(0, 5).map((tx: any) => ({
              txid: tx.txid,
              confirmed: tx.status.confirmed,
              blockHeight: tx.status.block_height,
              time: tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null
            })),
            explorerUrl: `https://mempool.space/address/${params.address}`
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    }
  ]
}
