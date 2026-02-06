'use client'

import { useState, useEffect } from 'react'
import { BitcoinPaymentQR } from './QRCode'

interface PaymentGateProps {
  onUnlock: () => void
  onBalanceUpdate: (balance: number) => void
}

export function PaymentGate({ onUnlock, onBalanceUpdate }: PaymentGateProps) {
  const [paymentMethod, setPaymentMethod] = useState<'lightning' | 'onchain'>('lightning')
  const [selectedAmount, setSelectedAmount] = useState(10000) // 10k sats default
  const [invoice, setInvoice] = useState<string | null>(null)
  const [btcAddress, setBtcAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'confirmed'>('idle')
  const [paymentId, setPaymentId] = useState<string | null>(null)

  const amounts = [
    { sats: 10000, label: '10k sats', usd: 4.30 },
    { sats: 50000, label: '50k sats', usd: 21.50 },
    { sats: 100000, label: '100k sats', usd: 43.00 },
    { sats: 500000, label: '500k sats', usd: 215.00 },
  ]

  const generatePayment = async () => {
    setIsLoading(true)
    
    try {
      // Generate user ID if not exists
      let userId = localStorage.getItem('onionxbt_user_id')
      if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem('onionxbt_user_id', userId)
      }

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: paymentMethod,
          amount: selectedAmount,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPaymentId(data.paymentId)
        if (paymentMethod === 'lightning') {
          setInvoice(data.invoice)
        } else {
          setBtcAddress(data.address)
        }
        setStatus('waiting')
        // Start polling for payment confirmation
        startPaymentPolling(data.paymentId)
      } else {
        console.error('Payment creation failed:', data.error)
      }
    } catch (err) {
      console.error('Payment error:', err)
    }
    
    setIsLoading(false)
  }

  const startPaymentPolling = (pId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/check?paymentId=${pId}`)
        const data = await response.json()

        if (data.status === 'confirmed') {
          clearInterval(pollInterval)
          setStatus('confirmed')
          onBalanceUpdate(data.newBalance || selectedAmount)
          setTimeout(() => onUnlock(), 1500)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds

    // Stop polling after 30 minutes
    setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000)
  }

  // Mock payment confirmation
  useEffect(() => {
    if (status === 'waiting') {
      const timer = setTimeout(() => {
        // In production, this would poll an API
        // For demo, auto-confirm after 5 seconds
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const simulatePayment = () => {
    setStatus('confirmed')
    onBalanceUpdate(selectedAmount)
    setTimeout(() => {
      onUnlock()
    }, 1500)
  }

  return (
    <section className="py-16" id="payment">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-btc-dark-gray rounded-3xl p-8 border border-btc-medium-gray shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-btc-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">₿</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Fund Your Account</h2>
              <p className="text-gray-400">Send Bitcoin to start using OnionXBT</p>
            </div>

            {status === 'idle' && (
              <>
                {/* Payment Method Toggle */}
                <div className="flex bg-btc-medium-gray rounded-xl p-1 mb-6">
                  <button
                    onClick={() => setPaymentMethod('lightning')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'lightning'
                        ? 'bg-btc-orange text-btc-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ⚡ Lightning
                  </button>
                  <button
                    onClick={() => setPaymentMethod('onchain')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'onchain'
                        ? 'bg-btc-orange text-btc-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ⛓️ On-chain
                  </button>
                </div>

                {/* Amount Selection */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 mb-3 block">Select Amount</label>
                  <div className="grid grid-cols-2 gap-3">
                    {amounts.map((amount) => (
                      <button
                        key={amount.sats}
                        onClick={() => setSelectedAmount(amount.sats)}
                        className={`p-4 rounded-xl border transition-all ${
                          selectedAmount === amount.sats
                            ? 'border-btc-orange bg-btc-orange/10'
                            : 'border-btc-medium-gray hover:border-btc-orange/50'
                        }`}
                      >
                        <p className="font-bold text-white">{amount.label}</p>
                        <p className="text-sm text-gray-500">≈ ${amount.usd}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Info */}
                <div className="bg-btc-medium-gray/50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-400 mb-2">💡 Pay-per-use pricing:</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Basic message: <span className="text-btc-orange">~50 sats</span></li>
                    <li>• Complex task: <span className="text-btc-orange">~200 sats</span></li>
                    <li>• Tor browsing: <span className="text-btc-orange">~100 sats</span></li>
                  </ul>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generatePayment}
                  disabled={isLoading}
                  className="w-full bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-btc-black border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate {paymentMethod === 'lightning' ? 'Invoice' : 'Address'}
                    </>
                  )}
                </button>
              </>
            )}

            {status === 'waiting' && (
              <div className="text-center">
                {/* QR Code with proper component */}
                <BitcoinPaymentQR
                  btcAddress={btcAddress || undefined}
                  lightningInvoice={invoice || undefined}
                  amount={selectedAmount}
                />

                <div className="flex items-center justify-center gap-2 text-gray-400 mt-6 mb-6">
                  <div className="w-4 h-4 border-2 border-btc-orange border-t-transparent rounded-full animate-spin" />
                  Waiting for payment...
                </div>

                {/* Demo button - remove in production */}
                <button
                  onClick={simulatePayment}
                  className="text-btc-orange hover:underline text-sm"
                >
                  [Demo] Simulate Payment
                </button>
              </div>
            )}

            {status === 'confirmed' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✓</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Payment Confirmed!</h3>
                <p className="text-gray-400">Unlocking OnionXBT...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
