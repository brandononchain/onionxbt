'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check admin authentication
    const adminToken = localStorage.getItem('onionxbt_admin_token')
    if (adminToken) {
      // Verify token with API
      verifyAdmin(adminToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyAdmin = async (token: string) => {
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIsAuthenticated(res.ok)
    } catch {
      setIsAuthenticated(false)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-btc-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-btc-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/revenue', label: 'Revenue', icon: '💰' },
    { href: '/admin/skills', label: 'Skills', icon: '🛠️' },
    { href: '/admin/payments', label: 'Payments', icon: '⚡' },
    { href: '/admin/affiliates', label: 'Affiliates', icon: '🤝' },
    { href: '/admin/api-keys', label: 'API Keys', icon: '🔑' },
    { href: '/admin/webhooks', label: 'Webhooks', icon: '🪝' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-btc-black flex">
      {/* Sidebar */}
      <aside className="w-64 bg-btc-dark-gray border-r border-btc-medium-gray">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-btc-orange flex items-center justify-center">
              <span className="text-xl">🧅</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">OnionXBT</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="px-4 pb-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                  isActive
                    ? 'bg-btc-orange text-btc-black font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-btc-medium-gray'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-btc-medium-gray">
          <button
            onClick={() => {
              localStorage.removeItem('onionxbt_admin_token')
              setIsAuthenticated(false)
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok && data.token) {
        localStorage.setItem('onionxbt_admin_token', data.token)
        onLogin()
      } else {
        setError(data.error || 'Invalid password')
      }
    } catch {
      setError('Login failed')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-btc-black flex items-center justify-center">
      <div className="bg-btc-dark-gray rounded-2xl p-8 w-full max-w-md border border-btc-medium-gray">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-btc-orange flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🧅</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-gray-500 mt-2">OnionXBT Control Panel</p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin Password"
            className="w-full bg-btc-medium-gray border border-btc-light-gray rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange mb-4"
          />

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
