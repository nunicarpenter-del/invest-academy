-- ── Capital Sources Board ─────────────────────────────────────────────────
-- 3rd pillar: Liquidity Intelligence Engine

CREATE TABLE IF NOT EXISTS capital_sources (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name                     TEXT NOT NULL,
  source_type              TEXT NOT NULL,  -- 'study_fund' | 'provident_fund' | 'savings' | 'property_equity'

  -- Financials
  current_balance          NUMERIC(15,2) NOT NULL DEFAULT 0,
  estimated_yield          NUMERIC(5,2)  NOT NULL DEFAULT 5.0,  -- annual %
  liquidity_date           DATE,                                -- when funds become accessible
  is_collateral            BOOLEAN       NOT NULL DEFAULT false, -- can pledge as loan collateral

  -- Allocation lock (Redline Logic)
  allocated_to_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  allocated_amount         NUMERIC(15,2),                       -- portion allocated (null = full balance)

  -- Meta
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE capital_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own capital_sources"
  ON capital_sources FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Index ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS capital_sources_user_id_idx ON capital_sources (user_id);
CREATE INDEX IF NOT EXISTS capital_sources_allocated_property_idx
  ON capital_sources (allocated_to_property_id)
  WHERE allocated_to_property_id IS NOT NULL;

-- ── Updated_at trigger (reuse existing if present) ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_capital_sources_updated_at'
  ) THEN
    CREATE TRIGGER set_capital_sources_updated_at
      BEFORE UPDATE ON capital_sources
      FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;
