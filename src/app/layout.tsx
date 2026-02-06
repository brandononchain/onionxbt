import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OnionXBT - The Uncensored BTC-Native AI Agent',
  description: 'Pay-per-use AI agent with no limits. Bitcoin payments. Tor network access. Skills marketplace.',
  icons: {
    icon: '/onion.svg',
  },
  openGraph: {
    title: 'OnionXBT',
    description: 'The Uncensored BTC-Native AI Agent',
    url: 'https://onionxbt.com',
    siteName: 'OnionXBT',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnionXBT',
    description: 'The Uncensored BTC-Native AI Agent',
    creator: '@onionxbt',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-btc-black min-h-screen">
        {children}
      </body>
    </html>
  )
}
