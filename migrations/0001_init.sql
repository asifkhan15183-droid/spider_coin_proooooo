PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','banned')),
  balance REAL NOT NULL DEFAULT 0,
  total_earned REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  reference TEXT UNIQUE,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(telegram_id) REFERENCES users(telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mining_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  claimed_at INTEGER,
  rate_per_hour REAL NOT NULL,
  cycle_seconds INTEGER NOT NULL DEFAULT 86400,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY(telegram_id) REFERENCES users(telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_mining_user ON mining_sessions(telegram_id, status);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL UNIQUE,
  reward REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'manual',
  target_url TEXT,
  reward REAL NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'once',
  verification_mode TEXT NOT NULL DEFAULT 'manual',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS task_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  telegram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  UNIQUE(task_id, telegram_id),
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(telegram_id) REFERENCES users(telegram_id)
);

CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  audience TEXT NOT NULL,
  website_url TEXT NOT NULL,
  amount_usdt REAL NOT NULL,
  tx_hash TEXT UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  campaign_status TEXT NOT NULL DEFAULT 'pending',
  target_visitors INTEGER NOT NULL DEFAULT 2000,
  visitors INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  amount REAL NOT NULL,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'BEP20',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  tx_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_streaks (
  telegram_id TEXT PRIMARY KEY,
  day INTEGER NOT NULL DEFAULT 0,
  last_claim_date TEXT,
  FOREIGN KEY(telegram_id) REFERENCES users(telegram_id)
);

CREATE TABLE IF NOT EXISTS supporter_passes (
  telegram_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT UNIQUE,
  purchased_at TEXT,
  FOREIGN KEY(telegram_id) REFERENCES users(telegram_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
