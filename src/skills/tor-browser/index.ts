/**
 * TorBrowser Skill
 * Deep web exploration with circuit management
 */

import { TorClient } from '../../lib/tor/client.js'

export default {
  name: 'TorBrowser',
  description: 'Browse .onion sites and the dark web safely. Includes circuit management, identity rotation, and content extraction.',
  icon: '🧅',
  price: 0,
  version: '1.0.0',
  author: 'onionxbt',
  tags: ['tor', 'privacy', 'browsing', 'darkweb', 'onion'],

  tools: [
    {
      name: 'tor_browse',
      description: 'Fetch and parse content from a .onion URL',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The .onion URL to browse' },
          extract: { 
            type: 'string', 
            enum: ['html', 'text', 'links', 'images'],
            description: 'What to extract from the page'
          },
          timeout: { type: 'number', description: 'Timeout in seconds (default 30)' }
        },
        required: ['url']
      },
      execute: async (params: { url: string; extract?: string; timeout?: number }) => {
        const tor = new TorClient()
        
        const result = await tor.fetch(params.url)
        
        if (!result.success) {
          return { error: result.error }
        }

        const html = result.body || ''
        
        switch (params.extract) {
          case 'text':
            // Strip HTML tags
            return { 
              text: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 10000)
            }
          
          case 'links':
            // Extract all links
            const linkRegex = /href=["']([^"']+)["']/gi
            const links: string[] = []
            let match
            while ((match = linkRegex.exec(html)) !== null) {
              links.push(match[1])
            }
            return { links: [...new Set(links)].slice(0, 100) }
          
          case 'images':
            // Extract image sources
            const imgRegex = /src=["']([^"']+\.(jpg|jpeg|png|gif|webp)[^"']*)["']/gi
            const images: string[] = []
            while ((match = imgRegex.exec(html)) !== null) {
              images.push(match[1])
            }
            return { images: [...new Set(images)].slice(0, 50) }
          
          default:
            return { html: html.slice(0, 20000), status: result.status }
        }
      }
    },
    {
      name: 'tor_new_identity',
      description: 'Get a new Tor circuit (new exit node IP)',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const tor = new TorClient()
        const success = await tor.newCircuit()
        
        if (success) {
          const newIP = await tor.getExitIP()
          return { success: true, newExitIP: newIP }
        }
        return { success: false, error: 'Failed to get new circuit' }
      }
    },
    {
      name: 'tor_check',
      description: 'Check if Tor is connected and get current exit IP',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const tor = new TorClient()
        const connected = await tor.isConnected()
        const exitIP = connected ? await tor.getExitIP() : null
        
        return {
          connected,
          exitIP,
          message: connected 
            ? `Tor connected via exit node ${exitIP}` 
            : 'Tor not connected - check if tor daemon is running'
        }
      }
    }
  ]
}
