/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        btc: {
          orange: '#F7931A',
          'orange-light': '#FFB84D',
          'orange-dark': '#CC7A15',
          black: '#0D0D0D',
          'dark-gray': '#1A1A1A',
          'medium-gray': '#2D2D2D',
          'light-gray': '#4D4D4D',
        },
        onion: {
          purple: '#7D4698',
          green: '#7EBD00',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-orange': 'pulse-orange 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-orange': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px #F7931A, 0 0 10px #F7931A' },
          '100%': { boxShadow: '0 0 20px #F7931A, 0 0 30px #F7931A' },
        }
      }
    },
  },
  plugins: [],
}
