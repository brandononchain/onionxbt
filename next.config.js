/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',
  
  // Experimental features
  experimental: {
    // Server actions for form handling
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Webpack configuration for native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle native modules
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      })
    }
    return config
  },
}

export default nextConfig
