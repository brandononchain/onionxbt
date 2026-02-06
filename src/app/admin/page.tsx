'use client'

import { useState, useEffect } from 'react'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  todayRevenue: number
  totalMessages: number
  todayMessages: number
  totalPayments: number
  pendingPayments: number
  skillInstalls: number
  affiliateEarnings: number
}

interface RevenueData {
  date: string
  revenue: number
  fees: number
  payouts: number
}

interface TopSkill {
  name: string
  installs: number
  revenue: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [topSkills, setTopSkills] = useState<TopSkill[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      
      const [statsRes, revenueRes, skillsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/revenue?range=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/top-skills', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (revenueRes.ok) setRevenueData((await revenueRes.json()).data)
      if (skillsRes.ok) setTopSkills((await skillsRes.json()).skills)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    }
    setIsLoading(false)
  }

  const formatSats = (sats: number) => {
    if (sats >= 100000000) return `${(sats / 100000000).toFixed(2)} BTC`
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(1)}M sats`
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k sats`
    return `${sats} sats`
  }

  const COLORS = ['#F7931A', '#FFB84D', '#CC7A15', '#7D4698', '#7EBD00']

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-btc-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and analytics</p>
        </div>
        
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-btc-orange text-btc-black'
                  : 'bg-btc-dark-gray text-gray-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          subValue={`${stats?.activeUsers || 0} active`}
          icon="👥"
          trend={12}
        />
        <StatCard
          title="Total Revenue"
          value={formatSats(stats?.totalRevenue || 0)}
          subValue={`${formatSats(stats?.todayRevenue || 0)} today`}
          icon="💰"
          trend={8}
        />
        <StatCard
          title="Messages"
          value={stats?.totalMessages || 0}
          subValue={`${stats?.todayMessages || 0} today`}
          icon="💬"
          trend={15}
        />
        <StatCard
          title="Payments"
          value={stats?.totalPayments || 0}
          subValue={`${stats?.pendingPayments || 0} pending`}
          icon="⚡"
          trend={5}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <h3 className="text-lg font-bold text-white mb-4">Revenue Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F7931A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F7931A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                <XAxis dataKey="date" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2D2D2D', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [formatSats(value), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#F7931A" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <h3 className="text-lg font-bold text-white mb-4">Revenue Breakdown</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Platform Fees', value: stats?.totalRevenue ? stats.totalRevenue * 0.05 : 0 },
                    { name: 'Skill Sales', value: stats?.totalRevenue ? stats.totalRevenue * 0.03 : 0 },
                    { name: 'API Usage', value: stats?.totalRevenue ? stats.totalRevenue * 0.02 : 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2D2D2D', borderRadius: '8px' }}
                  formatter={(value: number) => formatSats(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-btc-orange" />
              <span className="text-gray-400 text-sm">Platform Fees</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-btc-orange-light" />
              <span className="text-gray-400 text-sm">Skill Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-btc-orange-dark" />
              <span className="text-gray-400 text-sm">API Usage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Skills */}
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <h3 className="text-lg font-bold text-white mb-4">Top Skills</h3>
          <div className="space-y-4">
            {topSkills.slice(0, 5).map((skill, i) => (
              <div key={skill.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono w-6">{i + 1}</span>
                  <span className="text-white">{skill.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-btc-orange font-mono">{formatSats(skill.revenue)}</p>
                  <p className="text-gray-500 text-xs">{skill.installs} installs</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <ActivityItem
              type="payment"
              message="New Lightning payment received"
              amount={10000}
              time="2 min ago"
            />
            <ActivityItem
              type="user"
              message="New user registered via affiliate"
              time="5 min ago"
            />
            <ActivityItem
              type="skill"
              message="BTCPriceOracle skill purchased"
              amount={5000}
              time="12 min ago"
            />
            <ActivityItem
              type="payout"
              message="Developer payout processed"
              amount={-50000}
              time="1 hour ago"
            />
            <ActivityItem
              type="api"
              message="New API key created"
              time="2 hours ago"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  subValue, 
  icon, 
  trend 
}: { 
  title: string
  value: string | number
  subValue: string
  icon: string
  trend?: number
}) {
  return (
    <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-btc-orange/20 rounded-xl flex items-center justify-center">
          <span className="text-2xl">{icon}</span>
        </div>
        {trend !== undefined && (
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-500 text-sm mt-1">{subValue}</p>
    </div>
  )
}

function ActivityItem({
  type,
  message,
  amount,
  time,
}: {
  type: 'payment' | 'user' | 'skill' | 'payout' | 'api'
  message: string
  amount?: number
  time: string
}) {
  const icons = {
    payment: '⚡',
    user: '👤',
    skill: '🛠️',
    payout: '💸',
    api: '🔑',
  }

  const formatSats = (sats: number) => {
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k sats`
    return `${sats} sats`
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-btc-medium-gray last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icons[type]}</span>
        <span className="text-gray-300">{message}</span>
      </div>
      <div className="text-right">
        {amount !== undefined && (
          <p className={`font-mono ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {amount >= 0 ? '+' : ''}{formatSats(amount)}
          </p>
        )}
        <p className="text-gray-500 text-xs">{time}</p>
      </div>
    </div>
  )
}
