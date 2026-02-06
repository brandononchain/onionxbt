'use client'

import { useState, useEffect } from 'react'

interface Settings {
  // Platform
  platformName: string
  platformFee: number
  minDeposit: number
  
  // Affiliate
  affiliateCommission: number
  affiliateTier2: number
  minPayout: number
  
  // Skills
  skillMarketplaceFee: number
  skillReviewRequired: boolean
  
  // Pricing
  messageBaseCost: number
  messagePerToken: number
  torRequestCost: number
  xActionCost: number
  
  // AI
  defaultModel: string
  defaultProvider: string
  maxTokens: number
  
  // Security
  adminPassword: string
  requireApiKey: boolean
  rateLimitDefault: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    platformName: 'OnionXBT',
    platformFee: 5,
    minDeposit: 1000,
    affiliateCommission: 10,
    affiliateTier2: 2,
    minPayout: 100000,
    skillMarketplaceFee: 20,
    skillReviewRequired: false,
    messageBaseCost: 50,
    messagePerToken: 10,
    torRequestCost: 100,
    xActionCost: 150,
    defaultModel: 'claude-sonnet-4-20250514',
    defaultProvider: 'anthropic',
    maxTokens: 4096,
    adminPassword: '',
    requireApiKey: true,
    rateLimitDefault: 100,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'platform' | 'pricing' | 'ai' | 'security'>('platform')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setSettings({ ...settings, ...data })
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      const token = localStorage.getItem('onionxbt_admin_token')
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        setSaveMessage('Settings saved successfully!')
      } else {
        setSaveMessage('Failed to save settings')
      }
    } catch (err) {
      setSaveMessage('Failed to save settings')
    }
    
    setIsSaving(false)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const tabs = [
    { id: 'platform', label: 'Platform', icon: '⚙️' },
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'ai', label: 'AI Models', icon: '🤖' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ] as const

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 mt-1">Platform configuration</p>
        </div>
        
        <button 
          onClick={saveSettings}
          disabled={isSaving}
          className="bg-btc-orange hover:bg-btc-orange-light text-btc-black font-bold px-6 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saveMessage && (
        <div className={`mb-6 p-4 rounded-lg ${
          saveMessage.includes('success') 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-btc-orange text-btc-black'
                : 'bg-btc-dark-gray text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-btc-dark-gray rounded-2xl p-8 border border-btc-medium-gray">
        {/* Platform Settings */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-6">Platform Settings</h2>
            
            <SettingInput
              label="Platform Name"
              value={settings.platformName}
              onChange={(v) => setSettings({ ...settings, platformName: v })}
            />
            
            <SettingInput
              label="Platform Fee (%)"
              type="number"
              value={settings.platformFee}
              onChange={(v) => setSettings({ ...settings, platformFee: parseFloat(v) })}
              hint="Percentage taken from all transactions"
            />
            
            <SettingInput
              label="Minimum Deposit (sats)"
              type="number"
              value={settings.minDeposit}
              onChange={(v) => setSettings({ ...settings, minDeposit: parseInt(v) })}
            />
            
            <div className="border-t border-btc-medium-gray pt-6 mt-6">
              <h3 className="text-lg font-bold text-white mb-4">Affiliate Program</h3>
              
              <SettingInput
                label="Affiliate Commission (%)"
                type="number"
                value={settings.affiliateCommission}
                onChange={(v) => setSettings({ ...settings, affiliateCommission: parseFloat(v) })}
                hint="Commission on referred user spending"
              />
              
              <SettingInput
                label="Tier 2 Commission (%)"
                type="number"
                value={settings.affiliateTier2}
                onChange={(v) => setSettings({ ...settings, affiliateTier2: parseFloat(v) })}
                hint="Commission on sub-referral spending"
              />
              
              <SettingInput
                label="Minimum Payout (sats)"
                type="number"
                value={settings.minPayout}
                onChange={(v) => setSettings({ ...settings, minPayout: parseInt(v) })}
              />
            </div>
            
            <div className="border-t border-btc-medium-gray pt-6 mt-6">
              <h3 className="text-lg font-bold text-white mb-4">Skills Marketplace</h3>
              
              <SettingInput
                label="Marketplace Fee (%)"
                type="number"
                value={settings.skillMarketplaceFee}
                onChange={(v) => setSettings({ ...settings, skillMarketplaceFee: parseFloat(v) })}
                hint="Platform cut from paid skill sales"
              />
              
              <SettingToggle
                label="Require Review for New Skills"
                value={settings.skillReviewRequired}
                onChange={(v) => setSettings({ ...settings, skillReviewRequired: v })}
                hint="Skills must be approved before publishing"
              />
            </div>
          </div>
        )}

        {/* Pricing Settings */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-6">Pricing Settings</h2>
            
            <SettingInput
              label="Base Message Cost (sats)"
              type="number"
              value={settings.messageBaseCost}
              onChange={(v) => setSettings({ ...settings, messageBaseCost: parseInt(v) })}
              hint="Base cost per message"
            />
            
            <SettingInput
              label="Cost per 1k Tokens (sats)"
              type="number"
              value={settings.messagePerToken}
              onChange={(v) => setSettings({ ...settings, messagePerToken: parseInt(v) })}
              hint="Additional cost based on token usage"
            />
            
            <SettingInput
              label="Tor Request Cost (sats)"
              type="number"
              value={settings.torRequestCost}
              onChange={(v) => setSettings({ ...settings, torRequestCost: parseInt(v) })}
            />
            
            <SettingInput
              label="X/Twitter Action Cost (sats)"
              type="number"
              value={settings.xActionCost}
              onChange={(v) => setSettings({ ...settings, xActionCost: parseInt(v) })}
            />
            
            <div className="bg-btc-medium-gray rounded-xl p-4 mt-6">
              <h4 className="text-white font-medium mb-2">Pricing Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Simple message (~100 tokens)</span>
                  <span className="text-btc-orange">{settings.messageBaseCost + settings.messagePerToken} sats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Complex task (~1000 tokens)</span>
                  <span className="text-btc-orange">{settings.messageBaseCost + (settings.messagePerToken * 10)} sats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tor browsing + response</span>
                  <span className="text-btc-orange">{settings.messageBaseCost + settings.torRequestCost} sats</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Settings */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-6">AI Model Settings</h2>
            
            <SettingSelect
              label="Default Provider"
              value={settings.defaultProvider}
              onChange={(v) => setSettings({ ...settings, defaultProvider: v })}
              options={[
                { value: 'anthropic', label: 'Anthropic (Claude)' },
                { value: 'openai', label: 'OpenAI (GPT)' },
                { value: 'local', label: 'Local (Ollama)' },
              ]}
            />
            
            <SettingInput
              label="Default Model"
              value={settings.defaultModel}
              onChange={(v) => setSettings({ ...settings, defaultModel: v })}
              hint="e.g., claude-sonnet-4-20250514, gpt-4"
            />
            
            <SettingInput
              label="Max Tokens"
              type="number"
              value={settings.maxTokens}
              onChange={(v) => setSettings({ ...settings, maxTokens: parseInt(v) })}
              hint="Maximum response length"
            />
            
            <div className="bg-btc-medium-gray rounded-xl p-4 mt-6">
              <h4 className="text-white font-medium mb-2">Available Models</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-400">Anthropic</p>
                  <p className="text-white">claude-opus-4-5-20251101</p>
                  <p className="text-white">claude-sonnet-4-20250514</p>
                  <p className="text-white">claude-3-haiku</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">OpenAI</p>
                  <p className="text-white">gpt-4-turbo</p>
                  <p className="text-white">gpt-4</p>
                  <p className="text-white">gpt-3.5-turbo</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-6">Security Settings</h2>
            
            <SettingInput
              label="Admin Password"
              type="password"
              value={settings.adminPassword}
              onChange={(v) => setSettings({ ...settings, adminPassword: v })}
              hint="Leave blank to keep current password"
            />
            
            <SettingToggle
              label="Require API Key for All Requests"
              value={settings.requireApiKey}
              onChange={(v) => setSettings({ ...settings, requireApiKey: v })}
              hint="Unauthenticated requests will be rejected"
            />
            
            <SettingInput
              label="Default Rate Limit (requests/min)"
              type="number"
              value={settings.rateLimitDefault}
              onChange={(v) => setSettings({ ...settings, rateLimitDefault: parseInt(v) })}
            />
            
            <div className="border-t border-btc-medium-gray pt-6 mt-6">
              <h3 className="text-lg font-bold text-white mb-4">Danger Zone</h3>
              
              <div className="space-y-4">
                <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all">
                  Clear All Sessions
                </button>
                
                <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all ml-4">
                  Invalidate All API Keys
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SettingInput({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'password'
  hint?: string
}) {
  return (
    <div className="mb-4">
      <label className="text-gray-400 text-sm block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-md bg-btc-medium-gray border border-btc-light-gray rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-btc-orange"
      />
      {hint && <p className="text-gray-500 text-xs mt-1">{hint}</p>}
    </div>
  )
}

function SettingToggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  hint?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between max-w-md">
      <div>
        <label className="text-white block">{label}</label>
        {hint && <p className="text-gray-500 text-xs mt-1">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all ${
          value ? 'bg-btc-orange' : 'bg-btc-medium-gray'
        }`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-all ${
          value ? 'translate-x-6' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  )
}

function SettingSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="mb-4">
      <label className="text-gray-400 text-sm block mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-md bg-btc-medium-gray border border-btc-light-gray rounded-lg px-4 py-3 text-white focus:outline-none focus:border-btc-orange"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
