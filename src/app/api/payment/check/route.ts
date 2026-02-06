/**
 * Check payment status endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { LightningClient } from '@/lib/btc/lightning'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId' },
        { status: 400 }
      )
    }

    const db = getDB()
    const payment = db.getPayment(paymentId)

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // If already confirmed, return status
    if (payment.status === 'confirmed') {
      return NextResponse.json({
        status: 'confirmed',
        amount: payment.amount,
        confirmedAt: payment.confirmed_at,
      })
    }

    // Check Lightning payment
    if (payment.type === 'lightning' && payment.payment_hash) {
      const lightning = new LightningClient({
        provider: (process.env.LN_PROVIDER as any) || 'lnbits',
        endpoint: process.env.LN_ENDPOINT!,
        apiKey: process.env.LN_API_KEY,
      })

      const status = await lightning.checkInvoice(payment.payment_hash)

      if (status === 'paid') {
        // Confirm payment and credit user
        db.confirmPayment(paymentId)
        
        const user = db.getUser(payment.user_id)
        
        return NextResponse.json({
          status: 'confirmed',
          amount: payment.amount,
          newBalance: user?.balance || 0,
        })
      }

      if (status === 'expired') {
        db.db.prepare('UPDATE payments SET status = ? WHERE id = ?')
          .run('expired', paymentId)
        
        return NextResponse.json({ status: 'expired' })
      }
    }

    // On-chain payments need external confirmation
    // In production, use a blockchain API or BTCPay webhook
    if (payment.type === 'onchain') {
      // TODO: Check blockchain for payment to address
      // For now, return pending
      return NextResponse.json({
        status: 'pending',
        address: payment.address,
        amount: payment.amount,
        message: 'Waiting for on-chain confirmation',
      })
    }

    return NextResponse.json({
      status: 'pending',
      amount: payment.amount,
    })
  } catch (error: any) {
    console.error('Payment check failed:', error)
    return NextResponse.json(
      { error: error.message || 'Payment check failed' },
      { status: 500 }
    )
  }
}
