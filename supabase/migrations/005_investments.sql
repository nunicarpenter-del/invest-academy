-- ── Investments table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investments (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT            NOT NULL,
  symbol           TEXT,
  asset_type       TEXT            NOT NULL DEFAULT 'stock'
                   CHECK (asset_type IN ('stock','crypto','fund','bond','etf','other')),
  quantity         NUMERIC(18,6)   NOT NULL DEFAULT 0,
  purchase_price   NUMERIC(15,4),
  current_price    NUMERIC(15,4),
  currency         TEXT            NOT NULL DEFAULT 'ILS'
                   CHECK (currency IN ('ILS','USD')),
  notes            TEXT,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS investments_updated_at ON public.investments;
CREATE TRIGGER investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS investments_user_id_idx ON public.investments (user_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments"
  ON public.investments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments"
  ON public.investments FOR DELETE
  USING (auth.uid() = user_id);
