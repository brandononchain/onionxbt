/**
 * OnionXBT SDK
 * Official TypeScript/JavaScript SDK for integrating OnionXBT
 */

import WebSocket from 'ws'

export interface OnionConfig {
  apiKey: string
  baseUrl?: string
  wsUrl?: string
  timeout?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  id: string
  content: string
  tool_calls?: Array<{
    name: string
    input: any
    output: any
  }>
  usage: {
    cost_sats: number
    balance_remaining: number
  }
}

export interface Payment {
  id: string
  type: 'lightning' | 'onchain'
  amount: number
  status: 'pending' | 'confirmed' | 'expired'
  invoice?: string
  address?: string
  payment_hash?: string
  qr_svg?: string
  created_at: string
  confirmed_at?: string
}

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
  }>
}

export interface Balance {
  balance: number
  total_deposited: number
  total_spent: number
  currency: string
}

export type EventType = 
  | 'connected'
  | 'chat_response'
  | 'payment_confirmed'
  | 'error'

export interface OnionEvent {
  type: EventType
  [key: string]: any
}

/**
 * OnionXBT Client
 */
export class OnionXBT {
  private apiKey: string
  private baseUrl: string
  private wsUrl: string
  private timeout: number
  private ws: WebSocket | null = null
  private eventHandlers: Map<EventType, Set<(event: OnionEvent) => void>> = new Map()
  private messageCallbacks: Map<string, (response: any) => void> = new Map()

  constructor(config: OnionConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.onionxbt.com'
    this.wsUrl = config.wsUrl || 'wss://api.onionxbt.com/ws'
    this.timeout = config.timeout || 30000
  }

  // ============================================
  // HTTP Methods
  // ============================================

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new OnionError(error.error || 'Request failed', response.status)
    }

    return response.json()
  }

  // ============================================
  // Chat API
  // ============================================

  /**
   * Send a chat message and get a response
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    return this.request<ChatResponse>('POST', '/v1/chat', { messages })
  }

  /**
   * Simple single-message chat
   */
  async ask(question: string): Promise<string> {
    const response = await this.chat([{ role: 'user', content: question }])
    return response.content
  }

  // ============================================
  // Skills API
  // ============================================

  /**
   * List all available skills
   */
  async listSkills(): Promise<Skill[]> {
    const response = await this.request<{ skills: Skill[] }>('GET', '/v1/skills')
    return response.skills
  }

  /**
   * Execute a skill tool directly
   */
  async runTool(skill: string, tool: string, params: any = {}): Promise<any> {
    const response = await this.request<{ result: any }>(
      'POST',
      `/v1/skills/${skill}/tools/${tool}`,
      params
    )
    return response.result
  }

  // ============================================
  // Payments API
  // ============================================

  /**
   * Create a payment to add balance
   */
  async createPayment(
    amount: number,
    type: 'lightning' | 'onchain' = 'lightning'
  ): Promise<Payment> {
    return this.request<Payment>('POST', '/v1/payments', { amount, type })
  }

  /**
   * Check payment status
   */
  async getPayment(paymentId: string): Promise<Payment> {
    return this.request<Payment>('GET', `/v1/payments/${paymentId}`)
  }

  /**
   * Wait for a payment to be confirmed
   */
  async waitForPayment(
    paymentId: string,
    timeoutMs: number = 600000 // 10 minutes
  ): Promise<Payment> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const payment = await this.getPayment(paymentId)
      
      if (payment.status === 'confirmed') {
        return payment
      }
      
      if (payment.status === 'expired') {
        throw new OnionError('Payment expired', 408)
      }

      // Wait 3 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    throw new OnionError('Payment timeout', 408)
  }

  // ============================================
  // Balance API
  // ============================================

  /**
   * Get current balance
   */
  async getBalance(): Promise<Balance> {
    return this.request<Balance>('GET', '/v1/balance')
  }

  /**
   * Get usage history
   */
  async getUsage(limit: number = 50, offset: number = 0): Promise<any[]> {
    const response = await this.request<{ usage: any[] }>(
      'GET',
      `/v1/usage?limit=${limit}&offset=${offset}`
    )
    return response.usage
  }

  // ============================================
  // WebSocket (Real-time)
  // ============================================

  /**
   * Connect to WebSocket for real-time events
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.wsUrl}?api_key=${this.apiKey}`
      this.ws = new WebSocket(url)

      this.ws.on('open', () => {
        console.log('OnionXBT WebSocket connected')
        resolve()
      })

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString()) as OnionEvent
          this.handleEvent(event)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      })

      this.ws.on('error', (err) => {
        console.error('WebSocket error:', err)
        reject(err)
      })

      this.ws.on('close', () => {
        console.log('OnionXBT WebSocket disconnected')
        this.ws = null
      })
    })
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Send a chat message via WebSocket (streaming)
   */
  async chatStream(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new OnionError('WebSocket not connected', 500)
    }

    const messageId = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      // Set up callback for this message
      this.messageCallbacks.set(messageId, (response) => {
        if (response.type === 'error') {
          reject(new OnionError(response.message, 500))
        } else {
          resolve(response)
        }
        this.messageCallbacks.delete(messageId)
      })

      // Send message
      this.ws!.send(JSON.stringify({
        type: 'chat',
        id: messageId,
        messages
      }))

      // Timeout
      setTimeout(() => {
        if (this.messageCallbacks.has(messageId)) {
          this.messageCallbacks.delete(messageId)
          reject(new OnionError('Chat timeout', 408))
        }
      }, this.timeout)
    })
  }

  /**
   * Subscribe to events
   */
  on(event: EventType, handler: (event: OnionEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * Unsubscribe from events
   */
  off(event: EventType, handler: (event: OnionEvent) => void): void {
    this.eventHandlers.get(event)?.delete(handler)
  }

  private handleEvent(event: OnionEvent): void {
    // Handle message callbacks
    if (event.type === 'chat_response' && event.id) {
      const callback = this.messageCallbacks.get(event.id)
      if (callback) {
        callback(event)
        return
      }
    }

    // Dispatch to event handlers
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event)
        } catch (err) {
          console.error('Event handler error:', err)
        }
      }
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if API is reachable
   */
  async ping(): Promise<boolean> {
    try {
      await this.request('GET', '/health')
      return true
    } catch {
      return false
    }
  }

  /**
   * Get pricing information
   */
  async getPricing(): Promise<any> {
    return this.request('GET', '/v1/pricing')
  }
}

/**
 * Custom error class
 */
export class OnionError extends Error {
  public statusCode: number

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.name = 'OnionError'
    this.statusCode = statusCode
  }
}

/**
 * Create a new OnionXBT client
 */
export function createClient(config: OnionConfig): OnionXBT {
  return new OnionXBT(config)
}

// Default export
export default OnionXBT
