/**
 * Create payment endpoint
 * Generate BTC address or Lightning invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { OnionWallet } from '@/lib/btc/wallet'
import { LightningClient } from '@/lib/btc/lightning'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, type, amount } = body

    if (!userId || !type || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, amount' },
        { status: 400 }
      )
    }

    if (type !== 'onchain' && type !== 'lightning') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "onchain" or "lightning"' },
        { status: 400 }
      )
    }

    if (amount < 1000) {
      return NextResponse.json(
        { error: 'Minimum amount is 1000 sats' },
        { status: 400 }
      )
    }

    const db = getDB()

    // Get or create user
    let user = db.getUser(userId)
    if (!user) {
      user = db.createUser()
    }

    if (type === 'onchain') {
      // Generate a new BTC address
      const wallet = new OnionWallet({
        network: process.env.BTC_NETWORK as 'mainnet' | 'testnet' || 'mainnet',
        xpub: process.env.BTC_XPUB,
      })

      const { address, index } = wallet.deriveAddress(user.address_index || 0)

      // Update user's address index
      db.db.prepare('UPDATE users SET address_index = ? WHERE id = ?')
        .run(index + 1, userId)

      // Create payment record
      const payment = db.createPayment({
        user_id: userId,
        type: 'onchain',
        address,
        amount,
      })

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        type: 'onchain',
        address,
        amount,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      })
    }

    // Lightning invoice
    const lightning = new LightningClient({
      provider: (process.env.LN_PROVIDER as any) || 'lnbits',
      endpoint: process.env.LN_ENDPOINT!,
      apiKey: process.env.LN_API_KEY,
    })

    const invoice = await lightning.createInvoice(
      amount,
      `OnionXBT deposit for ${userId.slice(0, 8)}`
    )

    // Create payment record
    const payment = db.createPayment({
      user_id: userId,
      type: 'lightning',
      invoice: invoice.paymentRequest,
      payment_hash: invoice.paymentHash,
      amount,
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      type: 'lightning',
      invoice: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      amount,
      expiresAt: invoice.expiresAt,
    })
  } catch (error: any) {
    console.error('Payment creation failed:', error)
    return NextResponse.json(
      { error: error.message || 'Payment creation failed' },
      { status: 500 }
    )
  }
}
