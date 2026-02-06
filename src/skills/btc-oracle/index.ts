/**
 * BTC Price Oracle Skill
 * Real-time Bitcoin data, analysis, and alerts
 */

export default {
  name: 'BTCPriceOracle',
  description: 'Real-time Bitcoin price tracking with technical analysis, market sentiment, whale alerts, and mempool monitoring.',
  icon: '📈',
  price: 5000, // 5k sats
  version: '1.0.0',
  author: 'satoshi_dev',
  tags: ['bitcoin', 'trading', 'alerts', 'price', 'analysis'],

  tools: [
    {
      name: 'btc_price',
      description: 'Get current Bitcoin price from multiple exchanges',
      parameters: {
        type: 'object',
        properties: {
          currency: { type: 'string', description: 'Fiat currency (USD, EUR, etc)', default: 'USD' },
          exchanges: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Specific exchanges to query'
          }
        }
      },
      execute: async (params: { currency?: string; exchanges?: string[] }) => {
        const currency = params.currency?.toUpperCase() || 'USD'
        
        // Fetch from multiple sources
        const [coingecko, coinbase] = await Promise.all([
          fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency.toLowerCase()}&include_24hr_change=true`)
            .then(r => r.json()).catch(() => null),
          fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
            .then(r => r.json()).catch(() => null)
        ])

        const prices: Record<string, number> = {}
        
        if (coingecko?.bitcoin) {
          prices.coingecko = coingecko.bitcoin[currency.toLowerCase()]
        }
        if (coinbase?.data?.amount) {
          prices.coinbase = parseFloat(coinbase.data.amount)
        }

        const avgPrice = Object.values(prices).reduce((a, b) => a + b, 0) / Object.values(prices).length

        return {
          currency,
          prices,
          average: Math.round(avgPrice * 100) / 100,
          change24h: coingecko?.bitcoin?.[`${currency.toLowerCase()}_24h_change`] || null,
          timestamp: new Date().toISOString()
        }
      }
    },
    {
      name: 'btc_mempool',
      description: 'Get mempool stats and recommended fees',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const [fees, mempool] = await Promise.all([
          fetch('https://mempool.space/api/v1/fees/recommended').then(r => r.json()).catch(() => null),
          fetch('https://mempool.space/api/mempool').then(r => r.json()).catch(() => null)
        ])

        return {
          fees: fees ? {
            fastest: fees.fastestFee,
            halfHour: fees.halfHourFee,
            hour: fees.hourFee,
            economy: fees.economyFee,
            minimum: fees.minimumFee
          } : null,
          mempool: mempool ? {
            count: mempool.count,
            vsize: mempool.vsize,
            totalFee: mempool.total_fee,
            feeHistogram: mempool.fee_histogram?.slice(0, 10)
          } : null,
          congestion: fees ? (
            fees.fastestFee > 50 ? 'HIGH' : 
            fees.fastestFee > 20 ? 'MEDIUM' : 'LOW'
          ) : 'UNKNOWN'
        }
      }
    },
    {
      name: 'btc_block',
      description: 'Get latest block info',
      parameters: { 
        type: 'object',
        properties: {
          height: { type: 'number', description: 'Block height (omit for latest)' }
        }
      },
      execute: async (params: { height?: number }) => {
        const endpoint = params.height 
          ? `https://mempool.space/api/block-height/${params.height}`
          : 'https://mempool.space/api/blocks/tip/hash'
        
        const hash = await fetch(endpoint).then(r => r.text())
        const block = await fetch(`https://mempool.space/api/block/${hash}`).then(r => r.json())

        return {
          height: block.height,
          hash: block.id,
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          txCount: block.tx_count,
          size: block.size,
          weight: block.weight,
          difficulty: block.difficulty,
          nonce: block.nonce
        }
      }
    },
    {
      name: 'btc_whale_alert',
      description: 'Check recent large Bitcoin transactions',
      parameters: {
        type: 'object',
        properties: {
          minBTC: { type: 'number', description: 'Minimum BTC amount to report', default: 100 }
        }
      },
      execute: async (params: { minBTC?: number }) => {
        // In production, integrate with whale-alert.io API
        // For now, return simulated data structure
        return {
          note: 'Whale Alert API integration required for live data',
          recentAlerts: [
            {
              amount: 500,
              from: 'unknown',
              to: 'exchange',
              timestamp: new Date().toISOString(),
              interpretation: 'Possible sell pressure incoming'
            }
          ],
          threshold: params.minBTC || 100
        }
      }
    },
    {
      name: 'btc_halving',
      description: 'Get Bitcoin halving countdown',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const tipHeight = await fetch('https://mempool.space/api/blocks/tip/height').then(r => r.json())
        
        const HALVING_INTERVAL = 210000
        const nextHalvingHeight = Math.ceil(tipHeight / HALVING_INTERVAL) * HALVING_INTERVAL
        const blocksRemaining = nextHalvingHeight - tipHeight
        const halvingNumber = nextHalvingHeight / HALVING_INTERVAL

        // Estimate ~10 min per block
        const minutesRemaining = blocksRemaining * 10
        const estimatedDate = new Date(Date.now() + minutesRemaining * 60 * 1000)

        const currentReward = 50 / Math.pow(2, halvingNumber - 1)
        const nextReward = currentReward / 2

        return {
          currentHeight: tipHeight,
          nextHalvingHeight,
          blocksRemaining,
          halvingNumber,
          estimatedDate: estimatedDate.toISOString(),
          currentBlockReward: currentReward,
          nextBlockReward: nextReward,
          supplyAtHalving: (nextHalvingHeight * currentReward).toFixed(8)
        }
      }
    }
  ]
}
