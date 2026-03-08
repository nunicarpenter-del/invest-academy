-- ── Watchlist ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol       TEXT NOT NULL,
  display_name TEXT NOT NULL,
  exchange     TEXT,
  asset_type   TEXT DEFAULT 'stock',
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, symbol)
);
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "watchlist_own" ON watchlist
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Price Alerts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol       TEXT NOT NULL,
  display_name TEXT,
  condition    TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  target_price NUMERIC(15,4) NOT NULL,
  currency     TEXT DEFAULT 'ILS',
  is_triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "alerts_own" ON price_alerts
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Bank Account tagging on cash flow transactions ──────────────────────────
ALTER TABLE cash_flow_transactions
  ADD COLUMN IF NOT EXISTS bank_account TEXT;
