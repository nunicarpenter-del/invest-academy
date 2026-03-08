-- Investment tracking fields for property positions:
--   purchase_date        – date the property was acquired
--   target_exit_date     – planned sale / exit date (for non-residential / project types)
--   expected_sale_amount – projected sale price at exit

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS purchase_date         DATE,
  ADD COLUMN IF NOT EXISTS target_exit_date      DATE,
  ADD COLUMN IF NOT EXISTS expected_sale_amount  NUMERIC(15,2);
