/**
 * OnionXBT React SDK
 * React hooks and components for OnionXBT integration
 */

'use client'

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react'
import { OnionXBT, OnionConfig, ChatMessage, ChatResponse, Balance, Payment, OnionEvent } from './index'

// ============================================
// Context
// ============================================

interface OnionContextValue {
  client: OnionXBT | null
  isConnected: boolean
  balance: Balance | null
  isLoading: boolean
  error: string | null
  
  // Methods
  chat: (messages: ChatMessage[]) => Promise<ChatResponse>
  ask: (question: string) => Promise<string>
  createPayment: (amount: number, type?: 'lightning' | 'onchain') => Promise<Payment>
  refreshBalance: () => Promise<void>
  runTool: (skill: string, tool: string, params?: any) => Promise<any>
}

const OnionContext = createContext<OnionContextValue | null>(null)

// ============================================
// Provider
// ============================================

interface OnionProviderProps {
  config: OnionConfig
  children: ReactNode
  autoConnect?: boolean
}

export function OnionProvider({ 
  config, 
  children, 
  autoConnect = true 
}: OnionProviderProps) {
  const [client] = useState(() => new OnionXBT(config))
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Connect WebSocket
  useEffect(() => {
    if (autoConnect) {
      client.connect()
        .then(() => setIsConnected(true))
        .catch((err) => setError(err.message))
    }

    // Listen for payment confirmations
    client.on('payment_confirmed', (event) => {
      refreshBalance()
    })

    return () => {
      client.disconnect()
    }
  }, [client, autoConnect])

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    try {
      const bal = await client.getBalance()
      setBalance(bal)
    } catch (err: any) {
      setError(err.message)
    }
  }, [client])

  // Initial balance fetch
  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  // Chat
  const chat = useCallback(async (messages: ChatMessage[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await client.chat(messages)
      setBalance(prev => prev ? { 
        ...prev, 
        balance: response.usage.balance_remaining 
      } : null)
      return response
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [client])

  // Ask (simple)
  const ask = useCallback(async (question: string) => {
    const response = await chat([{ role: 'user', content: question }])
    return response.content
  }, [chat])

  // Create payment
  const createPayment = useCallback(async (
    amount: number, 
    type: 'lightning' | 'onchain' = 'lightning'
  ) => {
    setIsLoading(true)
    try {
      return await client.createPayment(amount, type)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [client])

  // Run tool
  const runTool = useCallback(async (
    skill: string, 
    tool: string, 
    params?: any
  ) => {
    setIsLoading(true)
    try {
      return await client.runTool(skill, tool, params)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [client])

  const value: OnionContextValue = {
    client,
    isConnected,
    balance,
    isLoading,
    error,
    chat,
    ask,
    createPayment,
    refreshBalance,
    runTool,
  }

  return (
    <OnionContext.Provider value={value}>
      {children}
    </OnionContext.Provider>
  )
}

// ============================================
// Hooks
// ============================================

/**
 * Main hook to access OnionXBT
 */
export function useOnion(): OnionContextValue {
  const context = useContext(OnionContext)
  if (!context) {
    throw new Error('useOnion must be used within an OnionProvider')
  }
  return context
}

/**
 * Hook for chat functionality
 */
export function useOnionChat() {
  const { chat, ask, isLoading, error } = useOnion()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [responses, setResponses] = useState<ChatResponse[]>([])

  const sendMessage = useCallback(async (content: string) => {
    const newMessage: ChatMessage = { role: 'user', content }
    const newMessages = [...messages, newMessage]
    setMessages(newMessages)

    try {
      const response = await chat(newMessages)
      setResponses(prev => [...prev, response])
      setMessages(prev => [...prev, { role: 'assistant', content: response.content }])
      return response
    } catch (err) {
      // Remove failed message
      setMessages(messages)
      throw err
    }
  }, [messages, chat])

  const clearHistory = useCallback(() => {
    setMessages([])
    setResponses([])
  }, [])

  return {
    messages,
    responses,
    sendMessage,
    clearHistory,
    isLoading,
    error
  }
}

/**
 * Hook for balance management
 */
export function useOnionBalance() {
  const { balance, refreshBalance, createPayment, isLoading } = useOnion()
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null)

  const topUp = useCallback(async (
    amount: number,
    type: 'lightning' | 'onchain' = 'lightning'
  ) => {
    const payment = await createPayment(amount, type)
    setPendingPayment(payment)
    return payment
  }, [createPayment])

  return {
    balance: balance?.balance || 0,
    totalDeposited: balance?.total_deposited || 0,
    totalSpent: balance?.total_spent || 0,
    pendingPayment,
    topUp,
    refresh: refreshBalance,
    isLoading
  }
}

/**
 * Hook for skill execution
 */
export function useOnionSkill(skillName: string) {
  const { runTool, isLoading, error } = useOnion()
  const [lastResult, setLastResult] = useState<any>(null)

  const execute = useCallback(async (toolName: string, params?: any) => {
    const result = await runTool(skillName, toolName, params)
    setLastResult(result)
    return result
  }, [skillName, runTool])

  return {
    execute,
    lastResult,
    isLoading,
    error
  }
}

/**
 * Hook for real-time events
 */
export function useOnionEvents(
  eventType: string,
  handler: (event: OnionEvent) => void
) {
  const { client } = useOnion()

  useEffect(() => {
    if (client) {
      client.on(eventType as any, handler)
      return () => {
        client.off(eventType as any, handler)
      }
    }
  }, [client, eventType, handler])
}

// ============================================
// Components
// ============================================

interface OnionChatProps {
  placeholder?: string
  className?: string
  onResponse?: (response: ChatResponse) => void
}

/**
 * Ready-to-use chat component
 */
export function OnionChat({ 
  placeholder = 'Ask OnionXBT anything...',
  className = '',
  onResponse
}: OnionChatProps) {
  const { messages, sendMessage, isLoading, error } = useOnionChat()
  const [input, setInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userInput = input
    setInput('')
    
    try {
      const response = await sendMessage(userInput)
      onResponse?.(response)
    } catch (err) {
      console.error('Chat error:', err)
    }
  }

  return (
    <div className={`onion-chat ${className}`}>
      <div className="onion-chat-messages">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`onion-chat-message onion-chat-message-${msg.role}`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="onion-chat-loading">Thinking...</div>
        )}
        {error && (
          <div className="onion-chat-error">{error}</div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="onion-chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="onion-chat-input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="onion-chat-button"
        >
          Send
        </button>
      </form>
    </div>
  )
}

interface OnionPaymentProps {
  amount: number
  type?: 'lightning' | 'onchain'
  onSuccess?: (payment: Payment) => void
  onError?: (error: Error) => void
  className?: string
}

/**
 * Payment component with QR code
 */
export function OnionPayment({
  amount,
  type = 'lightning',
  onSuccess,
  onError,
  className = ''
}: OnionPaymentProps) {
  const { createPayment } = useOnion()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'waiting' | 'confirmed' | 'error'>('idle')

  const startPayment = async () => {
    setStatus('loading')
    try {
      const p = await createPayment(amount, type)
      setPayment(p)
      setStatus('waiting')
      
      // Start polling for confirmation
      pollPayment(p.id)
    } catch (err: any) {
      setStatus('error')
      onError?.(err)
    }
  }

  const pollPayment = async (paymentId: string) => {
    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/check?paymentId=${paymentId}`)
        const data = await response.json()
        
        if (data.status === 'confirmed') {
          clearInterval(interval)
          setStatus('confirmed')
          onSuccess?.(data)
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 3000)

    // Stop after 30 minutes
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000)
  }

  return (
    <div className={`onion-payment ${className}`}>
      {status === 'idle' && (
        <button onClick={startPayment} className="onion-payment-button">
          Pay {amount.toLocaleString()} sats
        </button>
      )}
      
      {status === 'loading' && (
        <div className="onion-payment-loading">Creating payment...</div>
      )}
      
      {status === 'waiting' && payment && (
        <div className="onion-payment-qr">
          {payment.qr_svg && (
            <div dangerouslySetInnerHTML={{ __html: payment.qr_svg }} />
          )}
          <p className="onion-payment-amount">
            {payment.amount.toLocaleString()} sats
          </p>
          <p className="onion-payment-waiting">Waiting for payment...</p>
        </div>
      )}
      
      {status === 'confirmed' && (
        <div className="onion-payment-confirmed">
          ✓ Payment confirmed!
        </div>
      )}
      
      {status === 'error' && (
        <div className="onion-payment-error">
          Payment failed. <button onClick={startPayment}>Try again</button>
        </div>
      )}
    </div>
  )
}

// Export all
export default {
  OnionProvider,
  useOnion,
  useOnionChat,
  useOnionBalance,
  useOnionSkill,
  useOnionEvents,
  OnionChat,
  OnionPayment,
}
