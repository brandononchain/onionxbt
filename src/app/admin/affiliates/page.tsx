'use client'

import { useState, useEffect } from 'react'

interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  total_referrals: number
  active_referrals: number
  total_earnings: number
  pending_earnings: number
  paid_earnings: number
  tier: number
  created_at: string
}

interface Referral {
  id: string
  affiliate_id: string
  referred_user_id: string
  total_spend: number
  commission_earned: number
  created_at: string
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    totalReferrals: 0,
    totalEarnings: 0,
    pendingPayouts: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAffiliates()
    fetchStats()
  }, [])

  const fetchAffiliates = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch('/api/admin/affiliates', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setAffiliates(data.affiliates)
      }
    } catch (err) {
      console.error('Failed to fetch affiliates:', err)
    }
    setIsLoading(false)
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch('/api/admin/affiliates/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        setStats(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchReferrals = async (affiliateId: string) => {
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch(`/api/admin/affiliates/${affiliateId}/referrals`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setReferrals(data.referrals)
      }
    } catch (err) {
      console.error('Failed to fetch referrals:', err)
    }
  }

  const processPayout = async (affiliateId: string) => {
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      await fetch(`/api/admin/affiliates/${affiliateId}/payout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      fetchAffiliates()
      fetchStats()
    } catch (err) {
      console.error('Payout failed:', err)
    }
  }

  const formatSats = (sats: number) => {
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M`
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k`
    return sats.toString()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Affiliates</h1>
          <p className="text-gray-500 mt-1">Manage affiliate program</p>
        </div>
        
        <button className="bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold px-4 py-2 rounded-lg transition-all">
          Process All Payouts
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Total Affiliates</p>
          <p className="text-3xl font-bold text-white">{stats.totalAffiliates}</p>
        </div>
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Total Referrals</p>
          <p className="text-3xl font-bold text-white">{stats.totalReferrals}</p>
        </div>
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Total Earnings</p>
          <p className="text-3xl font-bold text-btc-orange">{formatSats(stats.totalEarnings)} sats</p>
        </div>
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Pending Payouts</p>
          <p className="text-3xl font-bold text-yellow-400">{formatSats(stats.pendingPayouts)} sats</p>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-btc-dark-gray rounded-2xl border border-btc-medium-gray overflow-hidden">
        <table className="w-full">
          <thead className="bg-btc-medium-gray">
            <tr>
              <th className="text-left text-gray-400 font-medium px-6 py-4">Referral Code</th>
              <th className="text-left text-gray-400 font-medium px-6 py-4">User</th>
              <th className="text-center text-gray-400 font-medium px-6 py-4">Tier</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Referrals</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Total Earned</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Pending</th>
              <th className="text-center text-gray-400 font-medium px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-btc-orange border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : affiliates.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-12">
                  No affiliates yet
                </td>
              </tr>
            ) : (
              affiliates.map((affiliate) => (
                <tr 
                  key={affiliate.id}
                  className="border-t border-btc-medium-gray hover:bg-btc-medium-gray/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-btc-orange">{affiliate.referral_code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-300">
                      {affiliate.user_id.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      affiliate.tier === 1 ? 'bg-blue-500/20 text-blue-400' :
                      affiliate.tier === 2 ? 'bg-purple-500/20 text-purple-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      Tier {affiliate.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-white">{affiliate.total_referrals}</span>
                    <span className="text-gray-500 text-sm ml-1">
                      ({affiliate.active_referrals} active)
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-green-400 font-mono">
                      {formatSats(affiliate.total_earnings)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-yellow-400 font-mono">
                      {formatSats(affiliate.pending_earnings)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAffiliate(affiliate)
                          fetchReferrals(affiliate.id)
                        }}
                        className="text-btc-orange hover:text-btc-orange-light transition-colors text-sm"
                      >
                        View
                      </button>
                      {affiliate.pending_earnings >= 100000 && (
                        <button
                          onClick={() => processPayout(affiliate.id)}
                          className="text-green-400 hover:text-green-300 transition-colors text-sm"
                        >
                          Payout
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Affiliate Detail Modal */}
      {selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-btc-dark-gray rounded-2xl p-8 w-full max-w-4xl border border-btc-medium-gray max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Affiliate Details</h2>
                <p className="font-mono text-btc-orange mt-1">{selectedAffiliate.referral_code}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedAffiliate(null)
                  setReferrals([])
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Affiliate Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-btc-medium-gray rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Referrals</p>
                <p className="text-white font-bold text-xl">{selectedAffiliate.total_referrals}</p>
              </div>
              <div className="bg-btc-medium-gray rounded-xl p-4">
                <p className="text-gray-400 text-sm">Active Referrals</p>
                <p className="text-white font-bold text-xl">{selectedAffiliate.active_referrals}</p>
              </div>
              <div className="bg-btc-medium-gray rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Earned</p>
                <p className="text-green-400 font-bold text-xl">{formatSats(selectedAffiliate.total_earnings)}</p>
              </div>
              <div className="bg-btc-medium-gray rounded-xl p-4">
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-yellow-400 font-bold text-xl">{formatSats(selectedAffiliate.pending_earnings)}</p>
              </div>
            </div>

            {/* Referrals Table */}
            <h3 className="text-lg font-bold text-white mb-4">Referrals</h3>
            <div className="bg-btc-medium-gray rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-btc-black/50">
                  <tr>
                    <th className="text-left text-gray-400 font-medium px-4 py-3 text-sm">User</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3 text-sm">Total Spend</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3 text-sm">Commission</th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3 text-sm">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="border-t border-btc-black/30">
                      <td className="px-4 py-3 font-mono text-sm text-gray-300">
                        {ref.referred_user_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-right text-white font-mono">
                        {formatSats(ref.total_spend)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-mono">
                        {formatSats(ref.commission_earned)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
