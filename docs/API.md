# OnionXBT API Documentation

## Base URL

```
Production: https://api.onionxbt.com
Development: http://localhost:3001
```

## Authentication

All API requests require an API key passed in the header:

```http
X-API-Key: your_api_key
```

Or as Bearer token:

```http
Authorization: Bearer your_api_key
```

## Rate Limits

- Default: 100 requests/minute
- Premium: 1000 requests/minute
- Enterprise: Custom

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699900000000
```

---

## Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

### Chat

Send messages to OnionXBT and receive AI responses.

```http
POST /v1/chat
```

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "What is Bitcoin?" }
  ],
  "stream": false
}
```

**Response:**
```json
{
  "id": "chat_abc123",
  "object": "chat.completion",
  "created": 1699900000000,
  "content": "Bitcoin is a decentralized digital currency...",
  "tool_calls": [
    {
      "name": "btc_price",
      "input": { "currency": "USD" },
      "output": { "price": 43000 }
    }
  ],
  "usage": {
    "cost_sats": 75,
    "balance_remaining": 9925
  }
}
```

---

### Skills

#### List All Skills

```http
GET /v1/skills
```

**Response:**
```json
{
  "skills": [
    {
      "name": "BTCPriceOracle",
      "description": "Real-time Bitcoin price tracking...",
      "icon": "📈",
      "price": 5000,
      "version": "1.0.0",
      "author": "satoshi_dev",
      "tags": ["bitcoin", "trading"],
      "tools": [
        { "name": "btc_price", "description": "Get current price" },
        { "name": "btc_mempool", "description": "Get mempool stats" }
      ]
    }
  ]
}
```

#### Execute Skill Tool

```http
POST /v1/skills/{skill}/tools/{tool}
```

**Example:**
```http
POST /v1/skills/BTCPriceOracle/tools/btc_price
Content-Type: application/json

{
  "currency": "USD"
}
```

**Response:**
```json
{
  "skill": "BTCPriceOracle",
  "tool": "btc_price",
  "result": {
    "currency": "USD",
    "prices": {
      "coingecko": 43000,
      "coinbase": 43050
    },
    "average": 43025,
    "change24h": 2.5
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

### Payments

#### Create Payment

```http
POST /v1/payments
```

**Request Body:**
```json
{
  "amount": 10000,
  "type": "lightning"
}
```

**Response:**
```json
{
  "id": "pay_abc123",
  "type": "lightning",
  "invoice": "lnbc100u1p...",
  "payment_hash": "abc123...",
  "amount": 10000,
  "qr_svg": "<svg>...</svg>",
  "expires_at": "2024-01-15T13:00:00.000Z"
}
```

#### Check Payment Status

```http
GET /v1/payments/{id}
```

**Response:**
```json
{
  "id": "pay_abc123",
  "type": "lightning",
  "amount": 10000,
  "status": "confirmed",
  "created_at": "2024-01-15T12:00:00.000Z",
  "confirmed_at": "2024-01-15T12:01:00.000Z"
}
```

---

### Balance

#### Get Balance

```http
GET /v1/balance
```

**Response:**
```json
{
  "balance": 50000,
  "total_deposited": 100000,
  "total_spent": 50000,
  "currency": "sats"
}
```

#### Get Usage History

```http
GET /v1/usage?limit=50&offset=0
```

**Response:**
```json
{
  "usage": [
    {
      "id": "use_abc123",
      "type": "message",
      "cost": 75,
      "details": { "model": "claude-sonnet" },
      "created_at": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

---

### Pricing

```http
GET /v1/pricing
```

**Response:**
```json
{
  "currency": "sats",
  "rates": {
    "message_base": 50,
    "message_per_1k_tokens": 10,
    "tool_call": 50,
    "tor_request": 100,
    "x_action": 150,
    "skill_usage": "varies by skill"
  },
  "minimumDeposit": 1000
}
```

---

## WebSocket API

Connect for real-time events and streaming chat.

### Connection

```
wss://api.onionxbt.com/ws?api_key=your_api_key
```

### Events

#### Connected
```json
{ "type": "connected", "user_id": "user_abc123" }
```

#### Chat Request
```json
{
  "type": "chat",
  "id": "msg_123",
  "messages": [{ "role": "user", "content": "Hello" }]
}
```

#### Chat Response
```json
{
  "type": "chat_response",
  "id": "msg_123",
  "content": "Hello! How can I help?",
  "cost": 50
}
```

#### Payment Confirmed
```json
{
  "type": "payment_confirmed",
  "payment_id": "pay_abc123",
  "amount": 10000
}
```

---

## Webhooks

### BTCPay Server

Configure webhook URL: `https://api.onionxbt.com/webhooks/btcpay`

Supported events:
- `InvoiceCreated`
- `InvoiceReceivedPayment`
- `InvoicePaymentSettled`
- `InvoiceSettled`
- `InvoiceExpired`

### LNbits

Configure webhook URL: `https://api.onionxbt.com/webhooks/lnbits`

### Generic Blockchain

For BlockCypher, Blockchain.com, etc:
`https://api.onionxbt.com/webhooks/blockchain`

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 402 | Payment Required - Insufficient balance |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "error": "Insufficient balance",
  "balance": 25,
  "minimumRequired": 50
}
```

---

## SDKs

### JavaScript/TypeScript

```bash
npm install onionxbt
```

```typescript
import { OnionXBT } from 'onionxbt'

const client = new OnionXBT({ apiKey: 'your_key' })

const answer = await client.ask('What is Bitcoin?')
console.log(answer)
```

### Python

```bash
pip install onionxbt
```

```python
from onionxbt import OnionXBT

client = OnionXBT(api_key='your_key')

answer = client.ask('What is Bitcoin?')
print(answer)
```

### React

```tsx
import { OnionProvider, useOnion } from 'onionxbt/sdk/react'

function App() {
  return (
    <OnionProvider config={{ apiKey: 'your_key' }}>
      <Chat />
    </OnionProvider>
  )
}

function Chat() {
  const { ask, isLoading } = useOnion()
  
  const handleAsk = async () => {
    const answer = await ask('What is Bitcoin?')
    console.log(answer)
  }
  
  return <button onClick={handleAsk}>Ask</button>
}
```

---

## Examples

### Fetch BTC Price

```bash
curl -X POST https://api.onionxbt.com/v1/skills/BTCPriceOracle/tools/btc_price \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD"}'
```

### Create Lightning Payment

```bash
curl -X POST https://api.onionxbt.com/v1/payments \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "type": "lightning"}'
```

### Chat with Agent

```bash
curl -X POST https://api.onionxbt.com/v1/chat \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Explain Lightning Network"}]}'
```

---

## Support

- Documentation: https://docs.onionxbt.com
- X/Twitter: [@onionxbt](https://x.com/onionxbt)
- Discord: Coming soon
- Email: support@onionxbt.com
