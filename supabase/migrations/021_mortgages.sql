-- ── Mortgage & Debt Intelligence Board ────────────────────────────────────

CREATE TABLE IF NOT EXISTS loans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name                TEXT NOT NULL,
  loan_type           TEXT NOT NULL DEFAULT 'mortgage',
  -- 'mortgage' | 'balloon' | 'bullet' | 'personal' | 'asset_backed'
  lender              TEXT,
  linked_property_id  UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- Principal
  original_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  start_date          DATE,
  end_date            DATE,   -- maturity / end date

  -- Tracks: array of {id, name, track_type, original_amount, remaining_balance, interest_rate, monthly_payment}
  -- track_type: 'prime' | 'fixed' | 'index_linked' | 'variable'
  tracks              JSONB NOT NULL DEFAULT '[]',

  -- Convenience: total monthly payment (sum of tracks, or manual override)
  monthly_payment     NUMERIC(10,2),

  -- Exit / refinancing windows without penalties
  -- Array of {date, description}
  exit_points         JSONB NOT NULL DEFAULT '[]',

  -- Index linkage (for CPI stress tests)
  is_index_linked     BOOLEAN NOT NULL DEFAULT false,
  index_base_rate     NUMERIC(5,3) DEFAULT 0,  -- current CPI linkage component

  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own loans"
  ON loans FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Index ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS loans_user_id_idx ON loans (user_id);
CREATE INDEX IF NOT EXISTS loans_property_idx ON loans (linked_property_id)
  WHERE linked_property_id IS NOT NULL;

-- ── Updated_at trigger ────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_loans_updated_at'
  ) THEN
    CREATE TRIGGER set_loans_updated_at
      BEFORE UPDATE ON loans
      FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;
