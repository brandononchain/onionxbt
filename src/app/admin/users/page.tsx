'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  created_at: string
  last_seen: string
  balance: number
  total_deposited: number
  total_spent: number
  message_count: number
  skills_installed: number
  referral_code?: string
  referred_by?: string
  status: 'active' | 'inactive' | 'banned'
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all')
  const [sortBy, setSortBy] = useState<'created' | 'balance' | 'spent' | 'messages'>('created')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchUsers()
  }, [filter, sortBy, page])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch(
        `/api/admin/users?filter=${filter}&sort=${sortBy}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
    setIsLoading(false)
  }

  const handleAction = async (userId: string, action: 'ban' | 'unban' | 'credit' | 'debit', amount?: number) => {
    const token = localStorage.getItem('onionxbt_admin_token')
    
    try {
      await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: amount ? JSON.stringify({ amount }) : undefined
      })
      
      fetchUsers()
      setSelectedUser(null)
    } catch (err) {
      console.error('Action failed:', err)
    }
  }

  const formatSats = (sats: number) => {
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(1)}M`
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k`
    return sats.toString()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredUsers = users.filter(user => 
    user.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-gray-500 mt-1">Manage platform users</p>
        </div>
        
        <button className="bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold px-4 py-2 rounded-lg transition-all">
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-btc-dark-gray border border-btc-medium-gray rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange w-64"
        />
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-btc-dark-gray border border-btc-medium-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-btc-orange"
        >
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="banned">Banned</option>
        </select>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-btc-dark-gray border border-btc-medium-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-btc-orange"
        >
          <option value="created">Newest First</option>
          <option value="balance">Highest Balance</option>
          <option value="spent">Most Spent</option>
          <option value="messages">Most Messages</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-btc-dark-gray rounded-2xl border border-btc-medium-gray overflow-hidden">
        <table className="w-full">
          <thead className="bg-btc-medium-gray">
            <tr>
              <th className="text-left text-gray-400 font-medium px-6 py-4">User ID</th>
              <th className="text-left text-gray-400 font-medium px-6 py-4">Joined</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Balance</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Deposited</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Spent</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Messages</th>
              <th className="text-center text-gray-400 font-medium px-6 py-4">Status</th>
              <th className="text-center text-gray-400 font-medium px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-btc-orange border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-12">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="border-t border-btc-medium-gray hover:bg-btc-medium-gray/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-white">
                      {user.id.slice(0, 8)}...{user.id.slice(-4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-btc-orange font-mono">{formatSats(user.balance)}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300 font-mono">
                    {formatSats(user.total_deposited)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300 font-mono">
                    {formatSats(user.total_spent)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300">
                    {user.message_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      user.status === 'banned' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-btc-orange hover:text-btc-orange-light transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-btc-dark-gray text-gray-400 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-btc-dark-gray text-gray-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onAction={handleAction}
        />
      )}
    </div>
  )
}

function UserDetailModal({
  user,
  onClose,
  onAction,
}: {
  user: User
  onClose: () => void
  onAction: (userId: string, action: 'ban' | 'unban' | 'credit' | 'debit', amount?: number) => void
}) {
  const [creditAmount, setCreditAmount] = useState('')

  const formatSats = (sats: number) => sats.toLocaleString()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-btc-dark-gray rounded-2xl p-8 w-full max-w-2xl border border-btc-medium-gray max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">User Details</h2>
            <p className="font-mono text-gray-500 mt-1">{user.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-btc-medium-gray rounded-xl p-4">
            <p className="text-gray-400 text-sm">Balance</p>
            <p className="text-btc-orange font-bold text-xl">{formatSats(user.balance)}</p>
          </div>
          <div className="bg-btc-medium-gray rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Deposited</p>
            <p className="text-white font-bold text-xl">{formatSats(user.total_deposited)}</p>
          </div>
          <div className="bg-btc-medium-gray rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Spent</p>
            <p className="text-white font-bold text-xl">{formatSats(user.total_spent)}</p>
          </div>
          <div className="bg-btc-medium-gray rounded-xl p-4">
            <p className="text-gray-400 text-sm">Messages</p>
            <p className="text-white font-bold text-xl">{user.message_count.toLocaleString()}</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between py-2 border-b border-btc-medium-gray">
            <span className="text-gray-400">Status</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              user.status === 'active' ? 'bg-green-500/20 text-green-400' :
              user.status === 'banned' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {user.status}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-btc-medium-gray">
            <span className="text-gray-400">Joined</span>
            <span className="text-white">{new Date(user.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-btc-medium-gray">
            <span className="text-gray-400">Last Active</span>
            <span className="text-white">{user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-btc-medium-gray">
            <span className="text-gray-400">Skills Installed</span>
            <span className="text-white">{user.skills_installed}</span>
          </div>
          {user.referral_code && (
            <div className="flex justify-between py-2 border-b border-btc-medium-gray">
              <span className="text-gray-400">Referral Code</span>
              <span className="text-btc-orange font-mono">{user.referral_code}</span>
            </div>
          )}
          {user.referred_by && (
            <div className="flex justify-between py-2 border-b border-btc-medium-gray">
              <span className="text-gray-400">Referred By</span>
              <span className="text-white font-mono">{user.referred_by}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Actions</h3>
          
          {/* Credit/Debit */}
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Amount (sats)"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="flex-1 bg-btc-medium-gray border border-btc-light-gray rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange"
            />
            <button
              onClick={() => {
                const amount = parseInt(creditAmount)
                if (amount > 0) onAction(user.id, 'credit', amount)
              }}
              disabled={!creditAmount || parseInt(creditAmount) <= 0}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
            >
              Credit
            </button>
            <button
              onClick={() => {
                const amount = parseInt(creditAmount)
                if (amount > 0) onAction(user.id, 'debit', amount)
              }}
              disabled={!creditAmount || parseInt(creditAmount) <= 0}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
            >
              Debit
            </button>
          </div>

          {/* Ban/Unban */}
          <div className="flex gap-3">
            {user.status === 'banned' ? (
              <button
                onClick={() => onAction(user.id, 'unban')}
                className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all"
              >
                Unban User
              </button>
            ) : (
              <button
                onClick={() => onAction(user.id, 'ban')}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all"
              >
                Ban User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
