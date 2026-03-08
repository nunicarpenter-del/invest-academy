-- Properties: new columns for ownership, expenses, pre-construction, overseas, professionals
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS ownership_percentage      NUMERIC(5,2)  DEFAULT 100,
  ADD COLUMN IF NOT EXISTS developer                 TEXT,
  ADD COLUMN IF NOT EXISTS expense_items             JSONB         DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS initial_equity            NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS delivery_equity           NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS completion_funding_source TEXT,         -- 'monthly_savings' | 'capital_source'
  ADD COLUMN IF NOT EXISTS funding_pension_account_id UUID REFERENCES pension_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS overseas_region           TEXT,         -- 'usa' | 'europe'
  ADD COLUMN IF NOT EXISTS overseas_location         TEXT,
  ADD COLUMN IF NOT EXISTS professionals             JSONB         DEFAULT '[]';

-- Pension: maturity date for cross-reference alerts
ALTER TABLE pension_accounts
  ADD COLUMN IF NOT EXISTS maturity_date DATE;
