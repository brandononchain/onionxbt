-- OnionXBT Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME,
  btc_address TEXT,  -- Dedicated receiving address
  address_index INTEGER,  -- HD wallet derivation index
  balance INTEGER DEFAULT 0,  -- Current balance in satoshis
  total_deposited INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0
);

-- Payments table (deposits)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('onchain', 'lightning')),
  address TEXT,  -- BTC address for onchain
  invoice TEXT,  -- BOLT11 for lightning
  payment_hash TEXT,
  amount INTEGER NOT NULL,  -- satoshis
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  txid TEXT,  -- On-chain transaction ID
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Usage table (spending)
CREATE TABLE IF NOT EXISTS usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'message', 'skill', 'tor', etc.
  cost INTEGER NOT NULL,  -- satoshis
  details TEXT,  -- JSON with extra info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  author_id TEXT,
  icon TEXT,
  price INTEGER DEFAULT 0,  -- 0 = free
  version TEXT DEFAULT '1.0.0',
  installs INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  tags TEXT,  -- JSON array
  code_path TEXT,  -- Path to skill code
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- User installed skills
CREATE TABLE IF NOT EXISTS user_skills (
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Skill ratings
CREATE TABLE IF NOT EXISTS skill_ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  UNIQUE (user_id, skill_id)
);

-- Developer payouts (for paid skills)
CREATE TABLE IF NOT EXISTS dev_payouts (
  id TEXT PRIMARY KEY,
  developer_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  amount INTEGER NOT NULL,  -- satoshis earned
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payout_address TEXT,  -- Developer's BTC address
  payout_txid TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  FOREIGN KEY (developer_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- X/Twitter posts
CREATE TABLE IF NOT EXISTS x_posts (
  id TEXT PRIMARY KEY,
  tweet_id TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'tweet' CHECK (type IN ('tweet', 'reply', 'quote')),
  reply_to TEXT,
  scheduled_for DATETIME,
  posted_at DATETIME,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversation history (for agent context)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  messages TEXT NOT NULL,  -- JSON array of messages
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id);
CREATE INDEX IF NOT EXISTS idx_x_posts_status ON x_posts(status);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
