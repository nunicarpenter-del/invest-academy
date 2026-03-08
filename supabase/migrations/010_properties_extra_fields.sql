-- Additional fields for the properties table:
--   total_cost      – total acquisition cost (purchase price + fees + taxes)
--   delivery_date   – actual/expected key handover date (common in Israeli real estate)
--   realtor_name    – agent / realtor name
--   realtor_commission – commission percentage (e.g. 2.0 = 2%)

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS total_cost          NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS delivery_date       DATE,
  ADD COLUMN IF NOT EXISTS realtor_name        TEXT,
  ADD COLUMN IF NOT EXISTS realtor_commission  NUMERIC(5,2);
