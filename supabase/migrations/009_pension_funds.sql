-- Pension & retirement accounts table
CREATE TABLE IF NOT EXISTS public.pension_accounts (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  account_type     TEXT        NOT NULL CHECK (account_type IN ('pension','study_fund','savings','provident')),
  provider         TEXT,
  balance          NUMERIC     NOT NULL DEFAULT 0,
  monthly_deposit  NUMERIC     NOT NULL DEFAULT 0,
  yield_percent    NUMERIC,
  start_date       DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pension_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_pension_accounts"
  ON public.pension_accounts FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pension_accounts_user_id_idx
  ON public.pension_accounts (user_id);
