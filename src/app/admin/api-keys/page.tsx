'use client'

import { useState, useEffect } from 'react'

interface APIKey {
  id: string
  user_id: string
  key: string
  name: string
  rate_limit: number
  active: boolean
  created_at: string
  last_used: string | null
  request_count: number
}

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyData, setNewKeyData] = useState({ userId: '', name: '', rateLimit: 100 })
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  useEffect(() => {
    fetchAPIKeys()
  }, [])

  const fetchAPIKeys = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys)
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err)
    }
    setIsLoading(false)
  }

  const createAPIKey = async () => {
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newKeyData)
      })
      
      if (res.ok) {
        const data = await res.json()
        setCreatedKey(data.key)
        fetchAPIKeys()
      }
    } catch (err) {
      console.error('Failed to create API key:', err)
    }
  }

  const toggleKeyStatus = async (keyId: string, active: boolean) => {
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !active })
      })
      
      fetchAPIKeys()
    } catch (err) {
      console.error('Failed to toggle key:', err)
    }
  }

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return
    
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      fetchAPIKeys()
    } catch (err) {
      console.error('Failed to delete key:', err)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  const maskKey = (key: string) => {
    return key.slice(0, 8) + '...' + key.slice(-4)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="text-gray-500 mt-1">Manage API access keys</p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold px-4 py-2 rounded-lg transition-all"
        >
          Create API Key
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Total Keys</p>
          <p className="text-3xl font-bold text-white">{apiKeys.length}</p>
        </div>
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Active Keys</p>
          <p className="text-3xl font-bold text-green-400">{apiKeys.filter(k => k.active).length}</p>
        </div>
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Total Requests (24h)</p>
          <p className="text-3xl font-bold text-btc-orange">
            {apiKeys.reduce((sum, k) => sum + k.request_count, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-btc-dark-gray rounded-2xl p-6 border border-btc-medium-gray">
          <p className="text-gray-400 text-sm mb-2">Inactive Keys</p>
          <p className="text-3xl font-bold text-gray-400">{apiKeys.filter(k => !k.active).length}</p>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-btc-dark-gray rounded-2xl border border-btc-medium-gray overflow-hidden">
        <table className="w-full">
          <thead className="bg-btc-medium-gray">
            <tr>
              <th className="text-left text-gray-400 font-medium px-6 py-4">Name</th>
              <th className="text-left text-gray-400 font-medium px-6 py-4">Key</th>
              <th className="text-left text-gray-400 font-medium px-6 py-4">User</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Rate Limit</th>
              <th className="text-right text-gray-400 font-medium px-6 py-4">Requests</th>
              <th className="text-center text-gray-400 font-medium px-6 py-4">Status</th>
              <th className="text-left text-gray-400 font-medium px-6 py-4">Last Used</th>
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
            ) : apiKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-12">
                  No API keys created yet
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr 
                  key={key.id}
                  className="border-t border-btc-medium-gray hover:bg-btc-medium-gray/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{key.name || 'Unnamed'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-400">{maskKey(key.key)}</span>
                      <button
                        onClick={() => copyToClipboard(key.key)}
                        className="text-btc-orange hover:text-btc-orange-light text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-300">
                      {key.user_id.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-300">{key.rate_limit}/min</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-btc-orange font-mono">{key.request_count.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      key.active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {key.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {key.last_used 
                      ? new Date(key.last_used).toLocaleString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => toggleKeyStatus(key.id, key.active)}
                        className={`text-sm ${
                          key.active 
                            ? 'text-yellow-400 hover:text-yellow-300' 
                            : 'text-green-400 hover:text-green-300'
                        }`}
                      >
                        {key.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => deleteKey(key.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-btc-dark-gray rounded-2xl p-8 w-full max-w-md border border-btc-medium-gray">
            {createdKey ? (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">API Key Created</h2>
                <div className="bg-btc-medium-gray rounded-xl p-4 mb-6">
                  <p className="text-gray-400 text-sm mb-2">Your new API key:</p>
                  <p className="font-mono text-btc-orange break-all">{createdKey}</p>
                </div>
                <p className="text-yellow-400 text-sm mb-6">
                  ⚠️ Save this key now! You won't be able to see it again.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => copyToClipboard(createdKey)}
                    className="flex-1 bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold py-3 rounded-xl transition-all"
                  >
                    Copy Key
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreatedKey(null)
                      setNewKeyData({ userId: '', name: '', rateLimit: 100 })
                    }}
                    className="flex-1 bg-btc-medium-gray hover:bg-btc-light-gray text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Create API Key</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">User ID</label>
                    <input
                      type="text"
                      value={newKeyData.userId}
                      onChange={(e) => setNewKeyData({ ...newKeyData, userId: e.target.value })}
                      placeholder="User ID to associate with this key"
                      className="w-full bg-btc-medium-gray border border-btc-light-gray rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Key Name</label>
                    <input
                      type="text"
                      value={newKeyData.name}
                      onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                      placeholder="e.g., Production, Testing"
                      className="w-full bg-btc-medium-gray border border-btc-light-gray rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Rate Limit (requests/min)</label>
                    <input
                      type="number"
                      value={newKeyData.rateLimit}
                      onChange={(e) => setNewKeyData({ ...newKeyData, rateLimit: parseInt(e.target.value) })}
                      className="w-full bg-btc-medium-gray border border-btc-light-gray rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange"
                    />
                  </div>
                </div>
                
                <button
                  onClick={createAPIKey}
                  disabled={!newKeyData.userId}
                  className="w-full bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold py-3 rounded-xl transition-all mt-6 disabled:opacity-50"
                >
                  Create Key
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
