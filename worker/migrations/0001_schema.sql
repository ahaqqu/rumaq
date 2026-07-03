-- RumaQ D1 schema v1
-- Cloudflare D1 uses SQLite. TEXT dates are ISO 8601.

-- ---------------------------------------------------------------------------
-- Accounts & households
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  google_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS household_members (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (household_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Household lookup lists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Product catalog & current stock
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_unit TEXT,
  category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_household ON items(household_id);

CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES locations(id),
  qty REAL NOT NULL DEFAULT 0,
  unit TEXT,
  expiry_date TEXT,
  run_out_days INTEGER,
  basis TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_household ON stock(household_id);
CREATE INDEX IF NOT EXISTS idx_stock_run_out ON stock(run_out_days);
CREATE INDEX IF NOT EXISTS idx_stock_expiry ON stock(expiry_date);

-- ---------------------------------------------------------------------------
-- Purchase history (receipts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_id TEXT REFERENCES stores(id),
  date TEXT NOT NULL,
  total INTEGER, -- stored in smallest currency unit, e.g. rupiah
  receipt_image_key TEXT, -- R2 object key
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchases_household_date ON purchases(household_id, date);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  qty REAL NOT NULL,
  unit TEXT,
  price INTEGER, -- line total in smallest currency unit
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

-- ---------------------------------------------------------------------------
-- AI shopping plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  total_estimate INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plans_household ON plans(household_id);

CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  store_id TEXT REFERENCES stores(id),
  qty REAL NOT NULL,
  unit TEXT,
  price_estimate INTEGER,
  why TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'bought', 'skipped')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items(plan_id);

-- ---------------------------------------------------------------------------
-- User preferences, AI key, and persona personalization
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  active_household_id TEXT REFERENCES households(id),
  motion_preference TEXT NOT NULL DEFAULT 'standard' CHECK (motion_preference IN ('none', 'reduced', 'standard')),
  currency TEXT NOT NULL DEFAULT 'idr' CHECK (currency IN ('idr', 'usd')),
  ai_provider TEXT,
  encrypted_ai_key TEXT,
  persona_user_role TEXT,
  persona_ai_role TEXT,
  persona_enabled INTEGER NOT NULL DEFAULT 0 CHECK (persona_enabled IN (0, 1)),
  theme_hue REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  provider TEXT,
  used INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 20,
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);

-- ---------------------------------------------------------------------------
-- Seed defaults for a fresh household (optional, run in app after household creation)
-- ---------------------------------------------------------------------------
-- The application creates default locations and stores when a household is created.
-- Keeping them out of this migration avoids hard-coding labels for all users.
