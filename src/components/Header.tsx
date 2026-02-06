'use client'

interface HeaderProps {
  isUnlocked: boolean
  balance: number
  activeTab: 'chat' | 'skills' | 'account'
  setActiveTab: (tab: 'chat' | 'skills' | 'account') => void
}

export function Header({ isUnlocked, balance, activeTab, setActiveTab }: HeaderProps) {
  // Format balance consistently
  const formattedBalance = balance.toLocaleString('en-US')

  return (
    <header className="sticky top-0 z-50 bg-btc-black/90 backdrop-blur-lg border-b border-btc-medium-gray">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-btc-orange flex items-center justify-center">
                <span className="text-2xl">🧅</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-btc-orange rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-btc-black">₿</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Onion<span className="text-btc-orange">XBT</span>
              </h1>
              <p className="text-[10px] text-gray-500 -mt-1">UNCENSORED AI</p>
            </div>
          </div>

          {/* Navigation (only when unlocked) */}
          {isUnlocked && (
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'chat', label: 'Chat', icon: '💬' },
                { id: 'skills', label: 'Skills', icon: '🛠️' },
                { id: 'account', label: 'Account', icon: '👤' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'chat' | 'skills' | 'account')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-btc-orange text-btc-black'
                      : 'text-gray-400 hover:text-white hover:bg-btc-medium-gray'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-4">
            {isUnlocked && (
              <div className="flex items-center gap-2 bg-btc-dark-gray px-4 py-2 rounded-full border border-btc-medium-gray">
                <span className="text-btc-orange font-bold">₿</span>
                <span className="font-mono text-white">{formattedBalance}</span>
                <span className="text-gray-500 text-sm">sats</span>
              </div>
            )}
            
            <a
              href="https://x.com/onionxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-btc-dark-gray flex items-center justify-center hover:bg-btc-medium-gray transition-colors border border-btc-medium-gray"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
