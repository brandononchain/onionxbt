/**
 * OnionXBT Tor Client
 * Browse .onion sites through the Tor network
 */

import { SocksProxyAgent } from 'socks-proxy-agent'

export interface TorConfig {
  socksPort: number
  controlPort: number
  controlPassword?: string
}

export interface TorFetchResult {
  success: boolean
  status?: number
  body?: string
  error?: string
}

export class TorClient {
  private config: TorConfig
  private agent: SocksProxyAgent

  constructor(config?: Partial<TorConfig>) {
    this.config = {
      socksPort: config?.socksPort || 9050,
      controlPort: config?.controlPort || 9051,
      controlPassword: config?.controlPassword,
    }

    // SOCKS5 proxy agent for Tor
    this.agent = new SocksProxyAgent(`socks5h://127.0.0.1:${this.config.socksPort}`)
  }

  /**
   * Fetch content from a .onion URL
   */
  async fetch(url: string, options?: RequestInit): Promise<TorFetchResult> {
    try {
      // Validate URL is .onion
      const parsedUrl = new URL(url)
      if (!parsedUrl.hostname.endsWith('.onion')) {
        return {
          success: false,
          error: 'URL must be a .onion address for Tor routing',
        }
      }

      const response = await fetch(url, {
        ...options,
        // @ts-ignore - Node.js fetch supports agent
        agent: this.agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0',
          ...options?.headers,
        },
      })

      const body = await response.text()

      return {
        success: true,
        status: response.status,
        body: body.slice(0, 50000), // Limit response size
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tor fetch failed',
      }
    }
  }

  /**
   * Get a new Tor circuit (new identity)
   */
  async newCircuit(): Promise<boolean> {
    try {
      const { Socket } = await import('net')
      
      return new Promise((resolve) => {
        const socket = new Socket()
        
        socket.connect(this.config.controlPort, '127.0.0.1', () => {
          // Authenticate
          if (this.config.controlPassword) {
            socket.write(`AUTHENTICATE "${this.config.controlPassword}"\r\n`)
          } else {
            socket.write('AUTHENTICATE\r\n')
          }
        })

        socket.on('data', (data) => {
          const response = data.toString()
          
          if (response.includes('250 OK')) {
            // Request new circuit
            socket.write('SIGNAL NEWNYM\r\n')
          }
          
          if (response.includes('250 OK') && response.includes('NEWNYM')) {
            socket.end()
            resolve(true)
          }
        })

        socket.on('error', () => {
          resolve(false)
        })

        socket.on('timeout', () => {
          socket.destroy()
          resolve(false)
        })

        socket.setTimeout(5000)
      })
    } catch {
      return false
    }
  }

  /**
   * Check if Tor is running and accessible
   */
  async isConnected(): Promise<boolean> {
    try {
      // Try to reach the Tor check page
      const result = await this.fetch('http://check.torproject.org/')
      return result.success && result.body?.includes('Congratulations')
    } catch {
      return false
    }
  }

  /**
   * Get current exit node IP (for debugging)
   */
  async getExitIP(): Promise<string | null> {
    try {
      const result = await this.fetch('http://api.ipify.org/')
      return result.success ? result.body?.trim() || null : null
    } catch {
      return null
    }
  }
}

/**
 * Check if Tor daemon is installed
 */
export async function isTorInstalled(): Promise<boolean> {
  try {
    const { exec } = await import('child_process')
    return new Promise((resolve) => {
      exec('which tor', (error) => {
        resolve(!error)
      })
    })
  } catch {
    return false
  }
}

/**
 * Start Tor daemon
 */
export async function startTor(): Promise<boolean> {
  try {
    const { spawn } = await import('child_process')
    const tor = spawn('tor', [], { detached: true, stdio: 'ignore' })
    tor.unref()
    
    // Wait for Tor to start
    await new Promise((resolve) => setTimeout(resolve, 5000))
    
    const client = new TorClient()
    return await client.isConnected()
  } catch {
    return false
  }
}
