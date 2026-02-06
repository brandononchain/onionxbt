/**
 * QR Code Generator for Bitcoin payments
 * Generates QR codes for Lightning invoices and on-chain addresses
 */

// QR Code generation using pure TypeScript (no external deps)
// Based on QR code specification ISO/IEC 18004

const EC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 } as const
type ECLevel = keyof typeof EC_LEVELS

// QR Code version capacities (numeric mode)
const CAPACITIES: Record<number, Record<ECLevel, number>> = {
  1: { L: 41, M: 34, Q: 27, H: 17 },
  2: { L: 77, M: 63, Q: 48, H: 34 },
  3: { L: 127, M: 101, Q: 77, H: 58 },
  4: { L: 187, M: 149, Q: 111, H: 82 },
  5: { L: 255, M: 202, Q: 144, H: 106 },
  // ... simplified for common sizes
  10: { L: 652, M: 513, Q: 364, H: 288 },
  15: { L: 1250, M: 991, Q: 703, H: 544 },
  20: { L: 2061, M: 1600, Q: 1159, H: 919 },
}

interface QROptions {
  errorCorrection?: ECLevel
  size?: number
  margin?: number
  darkColor?: string
  lightColor?: string
  logoUrl?: string
  logoSize?: number
}

/**
 * Generate a QR code as SVG
 */
export function generateQRSvg(data: string, options: QROptions = {}): string {
  const {
    errorCorrection = 'M',
    size = 256,
    margin = 4,
    darkColor = '#F7931A', // BTC Orange!
    lightColor = '#0D0D0D', // Dark background
  } = options

  // Use a simple QR encoding for demo
  // In production, use a proper QR library
  const modules = encodeQR(data, errorCorrection)
  const moduleCount = modules.length
  const moduleSize = (size - margin * 2) / moduleCount

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
  
  // Background
  svg += `<rect width="${size}" height="${size}" fill="${lightColor}"/>`
  
  // Modules
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules[row][col]) {
        const x = margin + col * moduleSize
        const y = margin + row * moduleSize
        svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${darkColor}"/>`
      }
    }
  }

  // Optional: Add Bitcoin logo in center
  if (options.logoUrl) {
    const logoS = options.logoSize || size * 0.2
    const logoX = (size - logoS) / 2
    const logoY = (size - logoS) / 2
    svg += `<image href="${options.logoUrl}" x="${logoX}" y="${logoY}" width="${logoS}" height="${logoS}"/>`
  }

  svg += '</svg>'
  return svg
}

/**
 * Generate QR code as Data URL (for img src)
 */
export function generateQRDataUrl(data: string, options: QROptions = {}): string {
  const svg = generateQRSvg(data, options)
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Generate QR code as PNG (requires canvas)
 */
export async function generateQRPng(data: string, options: QROptions = {}): Promise<Buffer> {
  // For server-side PNG generation, we'd use @napi-rs/canvas or sharp
  // For now, return SVG as buffer
  const svg = generateQRSvg(data, options)
  return Buffer.from(svg)
}

/**
 * Simple QR encoding (simplified for demo)
 * In production, use a proper QR library like 'qrcode'
 */
function encodeQR(data: string, ecLevel: ECLevel): boolean[][] {
  // Determine version based on data length
  const version = getMinVersion(data.length, ecLevel)
  const size = version * 4 + 17
  
  // Initialize matrix
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false))
  
  // Add finder patterns (the big squares in corners)
  addFinderPattern(matrix, 0, 0)
  addFinderPattern(matrix, size - 7, 0)
  addFinderPattern(matrix, 0, size - 7)
  
  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }
  
  // Add alignment patterns for version > 1
  if (version > 1) {
    const positions = getAlignmentPositions(version)
    for (const row of positions) {
      for (const col of positions) {
        if (!isFinderArea(row, col, size)) {
          addAlignmentPattern(matrix, row, col)
        }
      }
    }
  }
  
  // Encode data (simplified - just fills remaining space with data pattern)
  const encoded = encodeData(data)
  fillData(matrix, encoded, size)
  
  // Apply mask
  applyMask(matrix, 0) // Mask pattern 0
  
  return matrix
}

function getMinVersion(length: number, ecLevel: ECLevel): number {
  for (let v = 1; v <= 20; v++) {
    if (CAPACITIES[v] && CAPACITIES[v][ecLevel] >= length) {
      return v
    }
  }
  return 20
}

function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
      matrix[startRow + r][startCol + c] = isOuter || isInner
    }
  }
}

function addAlignmentPattern(matrix: boolean[][], centerRow: number, centerCol: number): void {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2
      const isCenter = r === 0 && c === 0
      matrix[centerRow + r][centerCol + c] = isEdge || isCenter
    }
  }
}

function getAlignmentPositions(version: number): number[] {
  if (version === 1) return []
  const interval = Math.floor(version / 7) + 1
  const positions: number[] = [6]
  let pos = version * 4 + 10
  
  while (positions.length < interval + 1) {
    positions.unshift(pos)
    pos -= Math.ceil((version * 4 + 4) / interval)
  }
  
  return positions
}

function isFinderArea(row: number, col: number, size: number): boolean {
  // Check if position overlaps with finder patterns
  const inTopLeft = row < 9 && col < 9
  const inTopRight = row < 9 && col >= size - 9
  const inBottomLeft = row >= size - 9 && col < 9
  return inTopLeft || inTopRight || inBottomLeft
}

function encodeData(data: string): boolean[] {
  // Simplified: Convert string to binary
  const bits: boolean[] = []
  for (const char of data) {
    const code = char.charCodeAt(0)
    for (let i = 7; i >= 0; i--) {
      bits.push(((code >> i) & 1) === 1)
    }
  }
  return bits
}

function fillData(matrix: boolean[][], data: boolean[], size: number): void {
  let dataIndex = 0
  let upward = true
  
  // Fill in zigzag pattern, avoiding reserved areas
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5 // Skip timing column
    
    for (let row = upward ? size - 1 : 0; upward ? row >= 0 : row < size; upward ? row-- : row++) {
      for (let c = 0; c < 2; c++) {
        const actualCol = col - c
        if (!isReserved(matrix, row, actualCol, size)) {
          if (dataIndex < data.length) {
            matrix[row][actualCol] = data[dataIndex++]
          }
        }
      }
    }
    upward = !upward
  }
}

function isReserved(matrix: boolean[][], row: number, col: number, size: number): boolean {
  // Check timing patterns
  if (row === 6 || col === 6) return true
  
  // Check finder patterns + separators
  if (isFinderArea(row, col, size)) return true
  
  return false
}

function applyMask(matrix: boolean[][], pattern: number): void {
  const size = matrix.length
  
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!isReserved(matrix, row, col, size)) {
        // Mask pattern 0: (row + col) % 2 === 0
        if ((row + col) % 2 === 0) {
          matrix[row][col] = !matrix[row][col]
        }
      }
    }
  }
}

/**
 * Generate Bitcoin URI with QR
 */
export function generateBitcoinQR(
  address: string,
  amount?: number,
  label?: string,
  options?: QROptions
): string {
  let uri = `bitcoin:${address}`
  const params: string[] = []
  
  if (amount) params.push(`amount=${amount}`)
  if (label) params.push(`label=${encodeURIComponent(label)}`)
  
  if (params.length > 0) {
    uri += '?' + params.join('&')
  }
  
  return generateQRSvg(uri.toUpperCase(), {
    ...options,
    darkColor: options?.darkColor || '#F7931A',
  })
}

/**
 * Generate Lightning invoice QR
 */
export function generateLightningQR(
  invoice: string,
  options?: QROptions
): string {
  // Lightning invoices are typically prefixed with 'lightning:'
  const uri = invoice.toLowerCase().startsWith('ln') 
    ? `lightning:${invoice}`
    : invoice
    
  return generateQRSvg(uri.toUpperCase(), {
    ...options,
    darkColor: options?.darkColor || '#F7931A',
  })
}

/**
 * Generate unified QR (BIP21 with Lightning fallback)
 */
export function generateUnifiedQR(
  btcAddress: string,
  lightningInvoice: string,
  amount?: number,
  options?: QROptions
): string {
  // BIP21 with BOLT11 lightning parameter
  let uri = `bitcoin:${btcAddress}`
  const params = [`lightning=${lightningInvoice}`]
  
  if (amount) {
    params.push(`amount=${amount / 100000000}`) // Convert sats to BTC
  }
  
  uri += '?' + params.join('&')
  
  return generateQRSvg(uri.toUpperCase(), {
    ...options,
    darkColor: options?.darkColor || '#F7931A',
  })
}
