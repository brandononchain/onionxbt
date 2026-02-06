'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { PaymentGate } from '@/components/PaymentGate'
import { ChatInterface } from '@/components/ChatInterface'
import { SkillsMarketplace } from '@/components/SkillsMarketplace'
import { Footer } from '@/components/Footer'

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [userBalance, setUserBalance] = useState(0) // in satoshis
  const [activeTab, setActiveTab] = useState<'chat' | 'skills' | 'account'>('chat')

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
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-btc-dark-gray rounded-2xl p-8 border border-btc-medium-gray">
        <h2 className="text-2xl font-bold text-btc-orange mb-6">Your Account</h2>
        
        <div className="space-y-6">
          <div className="bg-btc-medium-gray rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-2">Current Balance</p>
            <p className="text-4xl font-bold text-btc-orange">
              {balance.toLocaleString()} <span className="text-xl">sats</span>
            </p>
            <p className="text-gray-500 text-sm mt-1">
              ≈ ${(balance * 0.00043).toFixed(2)} USD
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
