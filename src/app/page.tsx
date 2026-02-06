'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Footer } from '@/components/Footer'

// Dynamically import client components with SSR disabled to prevent hydration issues
const Header = dynamic(() => import('@/components/Header').then(mod => ({ default: mod.Header })), { ssr: false })
const Hero = dynamic(() => import('@/components/Hero').then(mod => ({ default: mod.Hero })), { ssr: false })
const PaymentGate = dynamic(() => import('@/components/PaymentGate').then(mod => ({ default: mod.PaymentGate })), { ssr: false })
const ChatInterface = dynamic(() => import('@/components/ChatInterface').then(mod => ({ default: mod.ChatInterface })), { ssr: false })
const SkillsMarketplace = dynamic(() => import('@/components/SkillsMarketplace').then(mod => ({ default: mod.SkillsMarketplace })), { ssr: false })

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [userBalance, setUserBalance] = useState(0)
  const [activeTab, setActiveTab] = useState<'chat' | 'skills' | 'account'>('chat')

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
    // Check if user was previously unlocked
    const savedBalance = localStorage.getItem('onionxbt_balance')
    if (savedBalance) {
      const balance = parseInt(savedBalance)
      if (balance > 0) {
        setUserBalance(balance)
        setIsUnlocked(true)
      }
    }
  }, [])

  // Save balance to localStorage when it changes
  useEffect(() => {
    if (mounted && userBalance > 0) {
      localStorage.setItem('onionxbt_balance', userBalance.toString())
    }
  }, [userBalance, mounted])

  if (!mounted) {
    return (
      <main className="min-h-screen bg-btc-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-btc-orange border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-btc-black">
      <Header 
        isUnlocked={isUnlocked} 
        balance={userBalance}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      {!isUnlocked ? (
        <>
          <Hero />
          <PaymentGate 
            onUnlock={() => setIsUnlocked(true)}
            onBalanceUpdate={setUserBalance}
          />
        </>
      ) : (
        <div className="container mx-auto px-4 py-8">
          {activeTab === 'chat' && (
            <ChatInterface 
              balance={userBalance}
              onBalanceUpdate={setUserBalance}
            />
          )}
          {activeTab === 'skills' && (
            <SkillsMarketplace />
          )}
          {activeTab === 'account' && (
            <AccountPanel 
              balance={userBalance}
              onTopUp={setUserBalance}
            />
          )}
        </div>
      )}
      
      <Footer />
    </main>
  )
}

function AccountPanel({ balance, onTopUp }: { balance: number, onTopUp: (b: number) => void }) {
  // Format numbers consistently to avoid hydration issues
  const formattedBalance = balance.toLocaleString('en-US')
  const formattedUSD = (balance * 0.00043).toFixed(2)
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-btc-dark-gray rounded-2xl p-8 border border-btc-medium-gray">
        <h2 className="text-2xl font-bold text-btc-orange mb-6">Your Account</h2>
        
        <div className="space-y-6">
          <div className="bg-btc-medium-gray rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Current Balance</p>
            <p className="text-4xl font-bold text-btc-orange">
              {formattedBalance} <span className="text-xl">sats</span>
            </p>
            <p className="text-gray-500 text-sm mt-1">
              ≈ ${formattedUSD} USD
            </p>
          </div>

          <div className="bg-btc-medium-gray rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-4">Top Up Balance</p>
            <div className="grid grid-cols-3 gap-3">
              {[10000, 50000, 100000].map((amount) => (
                <button
                  key={amount}
                  className="bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold py-3 px-4 rounded-lg transition-all"
                >
                  {(amount / 1000).toFixed(0)}k sats
                </button>
              ))}
            </div>
          </div>

          <div className="bg-btc-medium-gray rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Usage This Month</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Messages sent</span>
                <span className="text-white font-mono">247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sats spent</span>
                <span className="text-btc-orange font-mono">12,350</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Skills used</span>
                <span className="text-white font-mono">8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
