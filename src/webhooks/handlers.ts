/**
 * OnionXBT Webhook Handlers
 * Process incoming webhooks from payment providers and external services
 */

import crypto from 'crypto'
import { getDB } from '../lib/db/index.js'

// ============================================
// Types
// ============================================

export interface WebhookEvent {
  type: string
  payload: any
  signature?: string
  timestamp: number
}

export interface WebhookHandler {
  provider: string
  verify: (event: WebhookEvent, secret: string) => boolean
  process: (event: WebhookEvent) => Promise<WebhookResult>
}

export interface WebhookResult {
  success: boolean
  action?: string
  data?: any
  error?: string
}

// ============================================
// Signature Verification
// ============================================

function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const expected = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// ============================================
// BTCPay Server Handler
// ============================================

export const btcpayHandler: WebhookHandler = {
  provider: 'btcpay',
  
  verify: (event, secret) => {
    if (!event.signature || !secret) return false
    
    // BTCPay uses HMAC-SHA256
    const payload = JSON.stringify(event.payload)
    const sig = event.signature.replace('sha256=', '')
    
    return verifyHmacSignature(payload, sig, secret)
  },
  
  process: async (event) => {
    const { type, payload } = event
    const db = getDB()
    
    switch (type) {
      case 'InvoiceCreated':
        console.log(`BTCPay: Invoice created ${payload.invoiceId}`)
        return { success: true, action: 'logged' }
      
      case 'InvoiceReceivedPayment':
        console.log(`BTCPay: Payment received for ${payload.invoiceId}`)
        return { success: true, action: 'logged' }
      
      case 'InvoicePaymentSettled':
      case 'InvoiceSettled':
        // Payment confirmed
        const payment = db.db.prepare(
          'SELECT * FROM payments WHERE invoice LIKE ? OR payment_hash = ?'
        ).get(`%${payload.invoiceId}%`, payload.invoiceId) as any
        
        if (payment && payment.status === 'pending') {
          db.confirmPayment(payment.id, payload.txId)
          
          return {
            success: true,
            action: 'payment_confirmed',
            data: {
              payment_id: payment.id,
              amount: payment.amount,
              user_id: payment.user_id
            }
          }
        }
        
        return { success: true, action: 'no_matching_payment' }
      
      case 'InvoiceExpired':
        const expiredPayment = db.db.prepare(
          'SELECT * FROM payments WHERE invoice LIKE ?'
        ).get(`%${payload.invoiceId}%`) as any
        
        if (expiredPayment) {
          db.db.prepare('UPDATE payments SET status = ? WHERE id = ?')
            .run('expired', expiredPayment.id)
        }
        
        return { success: true, action: 'invoice_expired' }
      
      default:
        return { success: true, action: 'unhandled_event' }
    }
  }
}

// ============================================
// LNbits Handler
// ============================================

export const lnbitsHandler: WebhookHandler = {
  provider: 'lnbits',
  
  verify: (event, secret) => {
    // LNbits doesn't have built-in webhook signing
    // Verify by checking payment hash exists
    return true
  },
  
  process: async (event) => {
    const { payload } = event
    const db = getDB()
    
    // LNbits sends payment_hash and checking_id
    const paymentHash = payload.payment_hash || payload.checking_id
    const pending = payload.pending
    
    if (!paymentHash) {
      return { success: false, error: 'Missing payment_hash' }
    }
    
    if (!pending) {
      // Payment confirmed
      const payment = db.getPaymentByHash(paymentHash)
      
      if (payment && payment.status === 'pending') {
        db.confirmPayment(payment.id)
        
        return {
          success: true,
          action: 'payment_confirmed',
          data: {
            payment_id: payment.id,
            amount: payment.amount,
            user_id: payment.user_id
          }
        }
      }
    }
    
    return { success: true, action: pending ? 'still_pending' : 'no_matching_payment' }
  }
}

// ============================================
// Strike Handler
// ============================================

export const strikeHandler: WebhookHandler = {
  provider: 'strike',
  
  verify: (event, secret) => {
    if (!event.signature || !secret) return false
    
    const payload = JSON.stringify(event.payload)
    return verifyHmacSignature(payload, event.signature, secret)
  },
  
  process: async (event) => {
    const { type, payload } = event
    const db = getDB()
    
    if (type === 'invoice.paid' || type === 'payment.completed') {
      const invoiceId = payload.invoiceId || payload.id
      
      const payment = db.db.prepare(
        'SELECT * FROM payments WHERE payment_hash = ? OR invoice LIKE ?'
      ).get(invoiceId, `%${invoiceId}%`) as any
      
      if (payment && payment.status === 'pending') {
        db.confirmPayment(payment.id)
        
        return {
          success: true,
          action: 'payment_confirmed',
          data: {
            payment_id: payment.id,
            amount: payment.amount,
            user_id: payment.user_id
          }
        }
      }
    }
    
    return { success: true, action: 'unhandled_event' }
  }
}

// ============================================
// Blockchain.com / BlockCypher Handler
// ============================================

export const blockchainHandler: WebhookHandler = {
  provider: 'blockchain',
  
  verify: (event, secret) => {
    // These services use URL tokens for verification
    return true
  },
  
  process: async (event) => {
    const { payload } = event
    const db = getDB()
    
    // Standard format: address, confirmations, value, tx_hash
    const { address, confirmations, value, tx_hash, hash } = payload
    const txid = tx_hash || hash
    
    if (!address) {
      return { success: false, error: 'Missing address' }
    }
    
    // Require at least 1 confirmation
    if ((confirmations || 0) >= 1) {
      const payment = db.db.prepare(
        'SELECT * FROM payments WHERE address = ? AND status = ?'
      ).get(address, 'pending') as any
      
      if (payment) {
        // Verify amount matches (value is in satoshis)
        const receivedAmount = value || 0
        
        if (receivedAmount >= payment.amount) {
          db.confirmPayment(payment.id, txid)
          
          return {
            success: true,
            action: 'payment_confirmed',
            data: {
              payment_id: payment.id,
              amount: payment.amount,
              user_id: payment.user_id,
              txid
            }
          }
        } else {
          return {
            success: false,
            error: 'Insufficient amount',
            data: { expected: payment.amount, received: receivedAmount }
          }
        }
      }
    }
    
    return { 
      success: true, 
      action: confirmations < 1 ? 'awaiting_confirmations' : 'no_matching_payment' 
    }
  }
}

// ============================================
// Mempool.space Handler
// ============================================

export const mempoolHandler: WebhookHandler = {
  provider: 'mempool',
  
  verify: () => true,
  
  process: async (event) => {
    const { payload } = event
    const db = getDB()
    
    // Mempool.space webhook format
    const { address, txid, vout, value, status } = payload
    
    if (status?.confirmed) {
      const payment = db.db.prepare(
        'SELECT * FROM payments WHERE address = ? AND status = ?'
      ).get(address, 'pending') as any
      
      if (payment && value >= payment.amount) {
        db.confirmPayment(payment.id, txid)
        
        return {
          success: true,
          action: 'payment_confirmed',
          data: {
            payment_id: payment.id,
            amount: payment.amount,
            user_id: payment.user_id
          }
        }
      }
    }
    
    return { success: true, action: 'logged' }
  }
}

// ============================================
// Webhook Registry
// ============================================

const handlers: Map<string, WebhookHandler> = new Map([
  ['btcpay', btcpayHandler],
  ['lnbits', lnbitsHandler],
  ['strike', strikeHandler],
  ['blockchain', blockchainHandler],
  ['blockcypher', blockchainHandler],
  ['mempool', mempoolHandler],
])

export function getWebhookHandler(provider: string): WebhookHandler | undefined {
  return handlers.get(provider.toLowerCase())
}

export function registerWebhookHandler(handler: WebhookHandler): void {
  handlers.set(handler.provider.toLowerCase(), handler)
}

// ============================================
// Webhook Processing
// ============================================

export async function processWebhook(
  provider: string,
  payload: any,
  signature?: string,
  secret?: string
): Promise<WebhookResult> {
  const handler = getWebhookHandler(provider)
  
  if (!handler) {
    return { success: false, error: `Unknown provider: ${provider}` }
  }
  
  const event: WebhookEvent = {
    type: payload.type || payload.event || 'unknown',
    payload,
    signature,
    timestamp: Date.now()
  }
  
  // Verify signature if secret provided
  if (secret && !handler.verify(event, secret)) {
    return { success: false, error: 'Invalid signature' }
  }
  
  // Process the webhook
  try {
    const result = await handler.process(event)
    
    // Log webhook
    const db = getDB()
    db.db.prepare(`
      INSERT INTO webhook_logs (id, provider, event_type, payload, result, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      crypto.randomUUID(),
      provider,
      event.type,
      JSON.stringify(payload),
      JSON.stringify(result)
    )
    
    return result
  } catch (err: any) {
    console.error(`Webhook processing error (${provider}):`, err)
    return { success: false, error: err.message }
  }
}

// Ensure webhook_logs table exists
export function initWebhookTables(): void {
  const db = getDB()
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_type TEXT,
      payload TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);
  `)
}
