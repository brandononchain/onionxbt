'use client'

import { useEffect, useState } from 'react'

interface QRCodeProps {
  data: string
  size?: number
  type?: 'bitcoin' | 'lightning' | 'generic'
  amount?: number
  label?: string
  showCopyButton?: boolean
  darkColor?: string
  lightColor?: string
}

export function QRCode({
  data,
  size = 256,
  type = 'generic',
  amount,
  label,
  showCopyButton = true,
  darkColor = '#F7931A',
  lightColor = '#FFFFFF',
}: QRCodeProps) {
  const [qrSvg, setQrSvg] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate QR code
    generateQR()
  }, [data, type, amount, label, size, darkColor, lightColor])

  const generateQR = async () => {
    // Call API to generate QR (or use client-side library)
    try {
      const response = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, type, amount, label, size, darkColor, lightColor }),
      })
      
      if (response.ok) {
        const { svg } = await response.json()
        setQrSvg(svg)
      } else {
        // Fallback: simple placeholder
        setQrSvg(createPlaceholderQR(size))
      }
    } catch {
      setQrSvg(createPlaceholderQR(size))
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(data)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const displayData = type === 'lightning' 
    ? data.slice(0, 20) + '...' + data.slice(-10)
    : data

  return (
    <div className="flex flex-col items-center">
      {/* QR Code */}
      <div 
        className="bg-white p-4 rounded-2xl shadow-lg"
        style={{ width: size + 32, height: size + 32 }}
      >
        {qrSvg ? (
          <div 
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            className="w-full h-full"
          />
        ) : (
          <div 
            className="w-full h-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center"
            style={{ width: size, height: size }}
          >
            <span className="text-gray-400">Loading...</span>
          </div>
        )}
      </div>

      {/* Type indicator */}
      <div className="mt-4 flex items-center gap-2">
        {type === 'lightning' && (
          <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            ⚡ Lightning
          </span>
        )}
        {type === 'bitcoin' && (
          <span className="bg-btc-orange/20 text-btc-orange text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            ₿ On-chain
          </span>
        )}
      </div>

      {/* Data display */}
      <div className="mt-3 max-w-full">
        <p className="font-mono text-xs text-gray-400 break-all text-center px-4">
          {displayData}
        </p>
      </div>

      {/* Amount if provided */}
      {amount && (
        <div className="mt-2">
          <p className="text-btc-orange font-bold">
            {amount.toLocaleString()} sats
          </p>
        </div>
      )}

      {/* Copy button */}
      {showCopyButton && (
        <button
          onClick={copyToClipboard}
          className={`mt-4 px-4 py-2 rounded-lg font-medium transition-all ${
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-btc-medium-gray text-white hover:bg-btc-orange hover:text-btc-black'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy to Clipboard'}
        </button>
      )}
    </div>
  )
}

/**
 * Create a simple placeholder QR pattern
 */
function createPlaceholderQR(size: number): string {
  const moduleSize = size / 25
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
  svg += `<rect width="${size}" height="${size}" fill="#0D0D0D"/>`
  
  // Simple grid pattern
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      if ((i + j) % 2 === 0 || (i < 7 && j < 7) || (i < 7 && j > 17) || (i > 17 && j < 7)) {
        svg += `<rect x="${j * moduleSize}" y="${i * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#F7931A"/>`
      }
    }
  }
  
  svg += '</svg>'
  return svg
}

/**
 * Bitcoin Payment QR with unified display
 */
export function BitcoinPaymentQR({
  btcAddress,
  lightningInvoice,
  amount,
  onPaymentDetected,
}: {
  btcAddress?: string
  lightningInvoice?: string
  amount?: number
  onPaymentDetected?: () => void
}) {
  const [paymentMethod, setPaymentMethod] = useState<'lightning' | 'onchain'>(
    lightningInvoice ? 'lightning' : 'onchain'
  )

  const data = paymentMethod === 'lightning' 
    ? lightningInvoice || ''
    : btcAddress || ''

  if (!data) {
    return (
      <div className="text-center text-gray-500">
        No payment data available
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Method toggle */}
      {lightningInvoice && btcAddress && (
        <div className="flex bg-btc-medium-gray rounded-xl p-1 mb-6">
          <button
            onClick={() => setPaymentMethod('lightning')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              paymentMethod === 'lightning'
                ? 'bg-btc-orange text-btc-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚡ Lightning
          </button>
          <button
            onClick={() => setPaymentMethod('onchain')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              paymentMethod === 'onchain'
                ? 'bg-btc-orange text-btc-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⛓️ On-chain
          </button>
        </div>
      )}

      {/* QR Code */}
      <QRCode
        data={data}
        type={paymentMethod === 'lightning' ? 'lightning' : 'bitcoin'}
        amount={amount}
        size={256}
      />

      {/* Payment method info */}
      <div className="mt-6 text-center text-sm text-gray-500 max-w-xs">
        {paymentMethod === 'lightning' ? (
          <p>
            Scan with any Lightning wallet. 
            <br />
            Instant confirmation. Lower fees.
          </p>
        ) : (
          <p>
            Scan with any Bitcoin wallet.
            <br />
            Requires 1+ confirmation (~10 min).
          </p>
        )}
      </div>
    </div>
  )
}
