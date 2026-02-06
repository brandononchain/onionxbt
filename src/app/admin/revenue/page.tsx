'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface RevenueStats {
  totalRevenue: number
  platformFees: number
  developerPayouts: number
  affiliatePayouts: number
  netRevenue: number
  transactionCount: number
}

interface DailyRevenue {
  date: string
  revenue: number
  fees: number
  payouts: number
  net: number
}

interface RevenueBreakdown {
  type: string
  amount: number
  percentage: number
  count: number
}

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([])
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRevenueData()
  }, [timeRange])

  const fetchRevenueData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      
      const [statsRes, dailyRes, breakdownRes] = await Promise.all([
        fetch(`/api/admin/revenue/stats?range=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/revenue/daily?range=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/revenue/breakdown?range=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (dailyRes.ok) setDailyData((await dailyRes.json()).data)
      if (breakdownRes.ok) setBreakdown((await breakdownRes.json()).breakdown)
    } catch (err) {
      console.error('Failed to fetch revenue data:', err)
    }
    setIsLoading(false)
  }

  const formatSats = (sats: number) => {
    if (sats >= 100000000) return `${(sats / 100000000).toFixed(4)} BTC`
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M sats`
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k sats`
    return `${sats} sats`
  }

  const formatUSD = (sats: number) => {
    const btcPrice = 43000 // Would be fetched in production
    const usd = (sats / 100000000) * btcPrice
    return `$${usd.toFixed(2)}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Revenue</h1>
          <p className="text-gray-500 mt-1">Financial analytics and reporting</p>
        </div>
        
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-btc-orange text-btc-black'
                  : 'bg-btc-dark-gray text-gray-400 hover:text-white'
              }`}
            >
              {range === 'all' ? 'All Time' : range}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-btc-orange">{formatSats(stats?.totalRevenue || 0)}</p>
          <p className="text-gray-500 text-sm mt-1">{formatUSD(stats?.totalRevenue || 0)}</p>
        </div>
        
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Platform Fees (5%)</p>
          <p className="text-3xl font-bold text-green-400">{formatSats(stats?.platformFees || 0)}</p>
          <p className="text-gray-500 text-sm mt-1">{formatUSD(stats?.platformFees || 0)}</p>
        </div>
        
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Developer Payouts</p>
          <p className="text-3xl font-bold text-yellow-400">{formatSats(stats?.developerPayouts || 0)}</p>
          <p className="text-gray-500 text-sm mt-1">{formatUSD(stats?.developerPayouts || 0)}</p>
        </div>
        
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Net Revenue</p>
          <p className="text-3xl font-bold text-white">{formatSats(stats?.netRevenue || 0)}</p>
          <p className="text-gray-500 text-sm mt-1">{formatUSD(stats?.netRevenue || 0)}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray mb-8">
        <h3 className="text-lg font-bold text-white mb-6">Revenue Over Time</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F7931A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F7931A" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
              <XAxis dataKey="date" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2D2D2D', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number, name: string) => [formatSats(value), name]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Gross Revenue"
                stroke="#F7931A" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
              <Area 
                type="monotone" 
                dataKey="net" 
                name="Net Revenue"
                stroke="#22C55E" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorNet)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <h3 className="text-lg font-bold text-white mb-6">Revenue by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                <XAxis type="number" stroke="#666" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="type" stroke="#666" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2D2D2D', borderRadius: '8px' }}
                  formatter={(value: number) => formatSats(value)}
                />
                <Bar dataKey="amount" fill="#F7931A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <h3 className="text-lg font-bold text-white mb-6">Revenue Breakdown</h3>
          <div className="space-y-4">
            {breakdown.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-btc-orange rounded-full" 
                       style={{ opacity: 0.3 + (item.percentage / 100) * 0.7 }} />
                  <div>
                    <p className="text-white font-medium">{item.type}</p>
                    <p className="text-gray-500 text-sm">{item.count.toLocaleString()} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-btc-orange font-mono">{formatSats(item.amount)}</p>
                  <p className="text-gray-500 text-sm">{item.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent High-Value Transactions */}
      <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray mt-6">
        <h3 className="text-lg font-bold text-white mb-6">High-Value Transactions</h3>
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-sm">
              <th className="text-left pb-4">Transaction ID</th>
              <th className="text-left pb-4">Type</th>
              <th className="text-left pb-4">User</th>
              <th className="text-right pb-4">Amount</th>
              <th className="text-right pb-4">Platform Fee</th>
              <th className="text-left pb-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-t border-btc-medium-gray">
                <td className="py-4 font-mono text-sm text-gray-300">txn_{Math.random().toString(36).slice(2, 10)}</td>
                <td className="py-4 text-gray-300">Skill Purchase</td>
                <td className="py-4 font-mono text-sm text-gray-300">user_{Math.random().toString(36).slice(2, 8)}</td>
                <td className="py-4 text-right text-btc-orange font-mono">{formatSats(Math.floor(Math.random() * 100000))}</td>
                <td className="py-4 text-right text-green-400 font-mono">{formatSats(Math.floor(Math.random() * 5000))}</td>
                <td className="py-4 text-gray-400 text-sm">{new Date().toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
