/**
 * OnionXBT Lightning Network Integration
 * Connect to LND, LNbits, or BTCPay Server
 */

export interface LightningConfig {
  provider: 'lnd' | 'lnbits' | 'btcpay'
  endpoint: string
  apiKey?: string
  macaroon?: string
}

export interface LNInvoice {
  paymentRequest: string  // BOLT11 invoice
  paymentHash: string
  amount: number  // satoshis
  memo: string
  expiresAt: Date
  status: 'pending' | 'paid' | 'expired'
}

export interface LNPayment {
  paymentHash: string
  amount: number
  fee: number
  status: 'pending' | 'succeeded' | 'failed'
  preimage?: string
}

export class LightningClient {
  private config: LightningConfig

  constructor(config: LightningConfig) {
    this.config = config
  }

  /**
   * Create an invoice for receiving payment
   */
  async createInvoice(amount: number, memo: string): Promise<LNInvoice> {
    switch (this.config.provider) {
      case 'lnbits':
        return this.createLNbitsInvoice(amount, memo)
      case 'btcpay':
        return this.createBTCPayInvoice(amount, memo)
      case 'lnd':
        return this.createLNDInvoice(amount, memo)
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`)
    }
  }

  /**
   * Check invoice status
   */
  async checkInvoice(paymentHash: string): Promise<LNInvoice['status']> {
    switch (this.config.provider) {
      case 'lnbits':
        return this.checkLNbitsInvoice(paymentHash)
      case 'btcpay':
        return this.checkBTCPayInvoice(paymentHash)
      case 'lnd':
        return this.checkLNDInvoice(paymentHash)
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`)
    }
  }

  // LNbits implementation
  private async createLNbitsInvoice(amount: number, memo: string): Promise<LNInvoice> {
    const response = await fetch(`${this.config.endpoint}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.config.apiKey!,
      },
      body: JSON.stringify({
        out: false,
        amount,
        memo,
        unit: 'sat',
      }),
    })

    if (!response.ok) {
      throw new Error(`LNbits error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      paymentRequest: data.payment_request,
      paymentHash: data.payment_hash,
      amount,
      memo,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      status: 'pending',
    }
  }

  private async checkLNbitsInvoice(paymentHash: string): Promise<LNInvoice['status']> {
    const response = await fetch(
      `${this.config.endpoint}/api/v1/payments/${paymentHash}`,
      {
        headers: {
          'X-Api-Key': this.config.apiKey!,
        },
      }
    )

    if (!response.ok) {
      return 'expired'
    }

    const data = await response.json()
    return data.paid ? 'paid' : 'pending'
  }

  // BTCPay Server implementation
  private async createBTCPayInvoice(amount: number, memo: string): Promise<LNInvoice> {
    const response = await fetch(`${this.config.endpoint}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        amount: amount / 100000000, // Convert sats to BTC
        currency: 'BTC',
        metadata: { memo },
      }),
    })

    if (!response.ok) {
      throw new Error(`BTCPay error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      paymentRequest: data.addresses?.BTC_LightningNetwork || '',
      paymentHash: data.id,
      amount,
      memo,
      expiresAt: new Date(data.expirationTime),
      status: 'pending',
    }
  }

  private async checkBTCPayInvoice(paymentHash: string): Promise<LNInvoice['status']> {
    const response = await fetch(
      `${this.config.endpoint}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices/${paymentHash}`,
      {
        headers: {
          'Authorization': `token ${this.config.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      return 'expired'
    }

    const data = await response.json()
    
    if (data.status === 'Settled' || data.status === 'Complete') return 'paid'
    if (data.status === 'Expired' || data.status === 'Invalid') return 'expired'
    return 'pending'
  }

  // LND implementation (via REST)
  private async createLNDInvoice(amount: number, memo: string): Promise<LNInvoice> {
    const response = await fetch(`${this.config.endpoint}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Grpc-Metadata-macaroon': this.config.macaroon!,
      },
      body: JSON.stringify({
        value: amount,
        memo,
        expiry: 3600, // 1 hour
      }),
    })

    if (!response.ok) {
      throw new Error(`LND error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      paymentRequest: data.payment_request,
      paymentHash: Buffer.from(data.r_hash, 'base64').toString('hex'),
      amount,
      memo,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      status: 'pending',
    }
  }

  private async checkLNDInvoice(paymentHash: string): Promise<LNInvoice['status']> {
    const hashBase64 = Buffer.from(paymentHash, 'hex').toString('base64url')
    
    const response = await fetch(
      `${this.config.endpoint}/v1/invoice/${hashBase64}`,
      {
        headers: {
          'Grpc-Metadata-macaroon': this.config.macaroon!,
        },
      }
    )

    if (!response.ok) {
      return 'expired'
    }

    const data = await response.json()
    
    if (data.settled) return 'paid'
    if (new Date(data.expiry * 1000) < new Date()) return 'expired'
    return 'pending'
  }
}
