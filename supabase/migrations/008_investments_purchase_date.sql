-- Add purchase_date to investments
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS purchase_date DATE;
