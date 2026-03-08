-- ============================================================
-- FILE: supabase/migrations/004_properties_cashflow.sql
-- PURPOSE: Add other_expenses; expand property_type options;
--          relax NOT NULL constraints for UI form inserts.
-- RUN ORDER: 4 of 4
-- ============================================================

-- 1. Add the missing column
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS other_expenses NUMERIC(15,2);

-- 2. Drop the old CHECK constraint that only allowed 'yielding' | 'primary_residence'
--    (PostgreSQL auto-names inline CHECK constraints as {table}_{column}_check)
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- 3. Add new CHECK with real-world property types
--    (legacy values kept so existing rows stay valid)
ALTER TABLE public.properties
  ADD CONSTRAINT properties_property_type_check
  CHECK (property_type IN (
    'apartment', 'house', 'commercial', 'land', 'other',
    'yielding', 'primary_residence'
  ));

-- 4. Default property_type to 'apartment'
ALTER TABLE public.properties
  ALTER COLUMN property_type SET DEFAULT 'apartment';

-- 5. Make current_value optional (form allows blank)
ALTER TABLE public.properties
  ALTER COLUMN current_value SET DEFAULT 0,
  ALTER COLUMN current_value DROP NOT NULL;

-- 6. Make mortgage_outstanding optional
ALTER TABLE public.properties
  ALTER COLUMN mortgage_outstanding DROP NOT NULL;
