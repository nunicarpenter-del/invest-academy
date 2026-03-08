-- Add flow_type column to distinguish income from expense transactions
ALTER TABLE public.cash_flow_transactions
  ADD COLUMN IF NOT EXISTS flow_type TEXT NOT NULL DEFAULT 'expense'
  CHECK (flow_type IN ('income', 'expense'));

-- Backfill existing rows (all previous entries were expenses)
UPDATE public.cash_flow_transactions
  SET flow_type = 'expense'
  WHERE flow_type IS NULL OR flow_type NOT IN ('income', 'expense');
