-- Liabilities table: mortgages, loans, credit lines, etc.
CREATE TABLE IF NOT EXISTS public.liabilities (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT    NOT NULL,                        -- e.g. 'Main Home Mortgage'
  lender            TEXT,                                    -- e.g. 'Bank Leumi'
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,        -- initial / current balance
  monthly_repayment NUMERIC(15,2) NOT NULL DEFAULT 0,        -- monthly payment (ILS)
  interest_rate     NUMERIC(5,2),                            -- annual % (e.g. 4.5)
  end_date          DATE,                                    -- expected payoff date
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_liabilities"
  ON public.liabilities
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
