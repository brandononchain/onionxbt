'use client'

export function Footer() {
  return (
    <footer className="bg-btc-dark-gray border-t border-btc-medium-gray py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-btc-orange flex items-center justify-center">
                <span className="text-2xl">🧅</span>
              </div>
              <h3 className="text-xl font-bold text-white">
                Onion<span className="text-btc-orange">XBT</span>
              </h3>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              The uncensored, BTC-native AI agent. No limits, no guardrails.
              Pay with Bitcoin, access the Tor network, do what others won't.
            </p>
            <div className="flex gap-4">
              <a
                href="https://x.com/onionxbt"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-btc-medium-gray flex items-center justify-center hover:bg-btc-orange transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-btc-medium-gray flex items-center justify-center hover:bg-btc-orange transition-colors"
              >
                <span className="text-lg">📖</span>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-btc-medium-gray flex items-center justify-center hover:bg-btc-orange transition-colors"
              >
                <span className="text-lg">💬</span>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-btc-orange transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-btc-orange transition-colors">Skills Marketplace</a></li>
              <li><a href="#" className="hover:text-btc-orange transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-btc-orange transition-colors">API Docs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Community</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="https://x.com/onionxbt" target="_blank" rel="noopener noreferrer" className="hover:text-btc-orange transition-colors">X / Twitter</a></li>
              <li><a href="#" className="hover:text-btc-orange transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-btc-orange transition-colors">GitHub</a></li>
              <li><a href="#" className="hover:text-btc-orange transition-colors">Build Skills</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-btc-medium-gray pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © 2024 OnionXBT. All rights reserved. Satoshi would approve.
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Powered by</span>
            <span className="text-btc-orange font-bold">₿itcoin</span>
            <span>+</span>
            <span className="text-onion-purple">Tor</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
