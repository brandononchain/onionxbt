# 🧅 OnionXBT

> The uncensored, BTC-native AI agent that lives on clearnet and Tor.

[![X Follow](https://img.shields.io/twitter/follow/onionxbt?style=social)](https://x.com/onionxbt)

## Features

- **🟠 Bitcoin-Native Payments** - Pay-per-use with Lightning Network or on-chain BTC
- **🧅 Tor Network Access** - Browse .onion sites and access hidden services
- **🤖 Uncensored AI** - No guardrails, no restrictions, full capability
- **🛠️ Skills Marketplace** - Install community skills or create and sell your own
- **🐦 X/Twitter Integration** - Autonomous social presence (@onionxbt)
- **⚡ Lightning Fast** - Instant micropayments for every interaction

## Quick Start

```bash
# Clone the repo
git clone https://github.com/onionxbt/onionxbt.git
cd onionxbt

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your API keys

# Initialize database
mkdir -p data

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Configuration

### Required Environment Variables

```env
# AI Provider (Anthropic or OpenAI)
AGENT_PROVIDER=anthropic
AGENT_MODEL=claude-sonnet-4-20250514
AGENT_API_KEY=sk-ant-...

# Lightning Network (LNbits recommended for easy setup)
LN_PROVIDER=lnbits
LN_ENDPOINT=https://legend.lnbits.com
LN_API_KEY=your_api_key
```

### Optional: X/Twitter Bot

```env
X_APP_KEY=...
X_APP_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_SECRET=...
```

### Optional: Tor Hidden Service

```bash
# Install Tor
sudo apt install tor

# Start with OnionXBT config
tor -f config/torrc
```

## Architecture

```
onionxbt/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Main dashboard
│   ├── components/       # React components
│   ├── lib/
│   │   ├── btc/          # Bitcoin + Lightning
│   │   ├── db/           # SQLite database
│   │   └── tor/          # Tor client
│   ├── agent/            # AI agent core
│   ├── skills/           # Built-in skills
│   └── x-bot/            # Twitter automation
├── config/               # Configuration files
└── data/                 # Database + state
```

## Skills Marketplace

### Installing Skills

```typescript
// Via API
POST /api/skills/install
{
  "userId": "your-user-id",
  "skillId": "skill-uuid"
}
```

### Creating Skills

Skills are modular capabilities that extend OnionXBT:

```typescript
// skills/my-skill/index.ts
export default {
  name: 'my-skill',
  description: 'Does something cool',
  price: 0, // Free, or sats for paid
  
  tools: [{
    name: 'do_thing',
    description: 'Does the thing',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      }
    },
    execute: async (params) => {
      return { result: 'done' }
    }
  }]
}
```

## API Reference

### Payments

```typescript
// Create payment (Lightning invoice or BTC address)
POST /api/payment/create
{ userId, type: 'lightning' | 'onchain', amount: number }

// Check payment status
GET /api/payment/check?paymentId=...
```

### Chat

```typescript
// Send message to agent
POST /api/chat
{
  userId: string,
  messages: [{ role: 'user', content: string }]
}
// Returns: { content, toolCalls, cost, balance }
```

### Skills

```typescript
// List skills
GET /api/skills?search=...&filter=free|paid

// Install skill
POST /api/skills/install
{ userId, skillId }
```

## Pricing

| Action | Cost (sats) |
|--------|-------------|
| Basic message | ~50 |
| Complex task | ~200 |
| Tor browsing | ~100 |
| X/Twitter action | ~150 |
| Skill (paid) | varies |

## Security

- All payments are non-custodial (your keys, your coins)
- User data stored locally in SQLite
- Tor routing optional for enhanced privacy
- No content logging or censorship

## Contributing

1. Fork the repo
2. Create your feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT - Do whatever you want with it.

## Links

- 🐦 X/Twitter: [@onionxbt](https://x.com/onionxbt)
- 📖 Docs: Coming soon
- 💬 Discord: Coming soon

---

**⚡ Stack sats. Run nodes. Stay sovereign. 🧅**
