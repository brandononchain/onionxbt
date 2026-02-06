/**
 * QR Code generation API
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  generateQRSvg, 
  generateBitcoinQR, 
  generateLightningQR,
  generateUnifiedQR 
} from '@/lib/qr/generator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      data, 
      type = 'generic', 
      amount, 
      label,
      size = 256,
      darkColor = '#F7931A',
      lightColor = '#FFFFFF',
      btcAddress,
      lightningInvoice,
    } = body

    if (!data && !btcAddress && !lightningInvoice) {
      return NextResponse.json(
        { error: 'Missing data, btcAddress, or lightningInvoice' },
        { status: 400 }
      )
    }

    let svg: string

    const options = { size, darkColor, lightColor }

    switch (type) {
      case 'bitcoin':
        svg = generateBitcoinQR(data || btcAddress, amount, label, options)
        break

      case 'lightning':
        svg = generateLightningQR(data || lightningInvoice, options)
        break

      case 'unified':
        if (!btcAddress || !lightningInvoice) {
          return NextResponse.json(
            { error: 'Unified QR requires both btcAddress and lightningInvoice' },
            { status: 400 }
          )
        }
        svg = generateUnifiedQR(btcAddress, lightningInvoice, amount, options)
        break

      default:
        svg = generateQRSvg(data, options)
    }

    return NextResponse.json({ 
      success: true, 
      svg,
      dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    })
  } catch (error: any) {
    console.error('QR generation failed:', error)
    return NextResponse.json(
      { error: error.message || 'QR generation failed' },
      { status: 500 }
    )
  }
}

// Also support GET for simple QR codes
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const data = searchParams.get('data')
  const type = searchParams.get('type') || 'generic'
  const size = parseInt(searchParams.get('size') || '256')
  
  if (!data) {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
  }

  try {
    let svg: string
    const options = { size, darkColor: '#F7931A', lightColor: '#FFFFFF' }

    switch (type) {
      case 'bitcoin':
        svg = generateBitcoinQR(data, undefined, undefined, options)
        break
      case 'lightning':
        svg = generateLightningQR(data, options)
        break
      default:
        svg = generateQRSvg(data, options)
    }

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
