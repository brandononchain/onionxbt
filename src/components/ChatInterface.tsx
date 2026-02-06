'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  cost?: number // sats
}

interface ChatInterfaceProps {
  balance: number
  onBalanceUpdate: (balance: number) => void
}

export function ChatInterface({ balance, onBalanceUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `🧅 **Welcome to OnionXBT**

I'm your uncensored AI agent. I can do things other AIs won't:

• Browse the Tor network (.onion sites)
• Execute code without restrictions  
• Access any website, API, or service
• Run shell commands
• Interact on X/Twitter as @onionxbt
• Use community skills from the marketplace

Your balance: **${balance.toLocaleString()} sats**

What do you want to do?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const cost = Math.floor(Math.random() * 100) + 50 // 50-150 sats
    const newBalance = balance - cost
    onBalanceUpdate(newBalance)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: getSimulatedResponse(input),
      timestamp: new Date(),
      cost,
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-btc-dark-gray rounded-2xl border border-btc-medium-gray overflow-hidden flex flex-col h-[70vh]">
        {/* Chat header */}
        <div className="bg-btc-medium-gray px-6 py-4 flex items-center justify-between border-b border-btc-medium-gray">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-btc-orange rounded-full flex items-center justify-center">
              <span className="text-xl">🧅</span>
            </div>
            <div>
              <h3 className="font-bold text-white">OnionXBT</h3>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Online • No limits mode
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Balance</p>
            <p className="font-mono text-btc-orange font-bold">{balance.toLocaleString()} sats</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-btc-orange text-btc-black'
                    : 'bg-btc-medium-gray text-white'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.cost && (
                  <p className="text-xs mt-2 opacity-60">
                    Cost: {message.cost} sats
                  </p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-btc-medium-gray rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-btc-orange rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-btc-orange rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-btc-orange rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-btc-medium-gray">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything... no limits."
              className="flex-1 bg-btc-medium-gray border border-btc-light-gray rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            ~50-200 sats per message • Tor routing available • X integration active
          </p>
        </div>
      </div>
    </div>
  )
}

function getSimulatedResponse(input: string): string {
  const lower = input.toLowerCase()
  
  if (lower.includes('tor') || lower.includes('onion')) {
    return `🧅 **Tor Network Access**

I can browse .onion sites through the Tor network. Here's what I can do:

• Access hidden services
• Anonymous browsing
• Scrape onion sites
• Check dark web marketplaces (read-only)

Want me to access a specific .onion address? Just paste it and I'll fetch the content.

⚠️ Note: I follow ethical guidelines but won't refuse legal requests.`
  }
  
  if (lower.includes('tweet') || lower.includes('twitter') || lower.includes('post')) {
    return `🐦 **X/Twitter Integration**

I can interact with my @onionxbt account:

• Post tweets
• Reply to mentions
• Quote tweet
• Like and retweet
• Check timeline

What would you like me to post? I'll draft it first for your approval.`
  }
  
  if (lower.includes('skill') || lower.includes('marketplace')) {
    return `🛠️ **Skills Marketplace**

Check out the Skills tab to browse community-created skills. Popular ones include:

• **TorBrowser** - Deep web exploration
• **BTCTracker** - Real-time price alerts
• **CodeRunner** - Execute any code
• **SocialAutomation** - Multi-platform posting

You can also create and sell your own skills for BTC!`
  }
  
  return `Got it. I'm processing your request with no restrictions.

Here's what I'm thinking:
1. Analyzing your intent
2. Checking available tools
3. Executing without guardrails

Is there anything specific you want me to focus on? Remember, I can:
• Browse any website (including Tor)
• Run code and commands
• Access APIs
• Post to X as @onionxbt

Your remaining balance: tracking per message.`
}
