'use client'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-btc-orange/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-btc-orange/10 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-btc-dark-gray px-4 py-2 rounded-full border border-btc-orange/30 mb-8">
            <span className="w-2 h-2 bg-btc-orange rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">Powered by Bitcoin Lightning ⚡</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">The </span>
            <span className="text-btc-orange glow-orange">Uncensored</span>
            <br />
            <span className="text-white">AI Agent</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
            No limits. No guardrails. Pay with Bitcoin.
            <br />
            <span className="text-btc-orange">OnionXBT</span> does what others won't.
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12 mb-12">
            <FeatureCard
              icon="⚡"
              title="Lightning Fast"
              description="Pay-per-message with Lightning Network. Instant, cheap, private."
            />
            <FeatureCard
              icon="🧅"
              title="Tor Network"
              description="Access .onion sites. Browse anonymously. No traces left behind."
            />
            <FeatureCard
              icon="🛠️"
              title="Skills Marketplace"
              description="Install community skills. Create and sell your own."
            />
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-12 text-center">
            <div>
              <p className="text-3xl font-bold text-btc-orange">50+</p>
              <p className="text-gray-500 text-sm">Active Skills</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-btc-orange">∞</p>
              <p className="text-gray-500 text-sm">Possibilities</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-btc-orange">0</p>
              <p className="text-gray-500 text-sm">Censorship</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-btc-dark-gray/50 backdrop-blur border border-btc-medium-gray rounded-2xl p-6 hover:border-btc-orange/50 transition-colors">
      <div className="w-12 h-12 bg-btc-orange/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )
}
