-- ── Cash Flow Transactions table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_flow_transactions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id      UUID          REFERENCES public.properties(id) ON DELETE SET NULL,
  transaction_type TEXT          NOT NULL DEFAULT 'fixed'
                   CHECK (transaction_type IN ('fixed', 'variable')),
  category         TEXT          NOT NULL,
  amount           NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  date             DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Reuse or create the set_updated_at function (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS cash_flow_transactions_updated_at ON public.cash_flow_transactions;
CREATE TRIGGER cash_flow_transactions_updated_at
  BEFORE UPDATE ON public.cash_flow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS cft_user_id_idx  ON public.cash_flow_transactions (user_id);
CREATE INDEX IF NOT EXISTS cft_date_idx     ON public.cash_flow_transactions (date DESC);
CREATE INDEX IF NOT EXISTS cft_property_idx ON public.cash_flow_transactions (property_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.cash_flow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.cash_flow_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.cash_flow_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.cash_flow_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.cash_flow_transactions FOR DELETE
  USING (auth.uid() = user_id);
