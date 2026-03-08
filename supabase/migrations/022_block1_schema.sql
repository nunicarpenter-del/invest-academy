-- Block 1: Core & Logic Refresh
-- Run this in the Supabase SQL editor

-- 1. Properties: contract price + closing fees (total_cost remains, now computed)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS contract_price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS closing_fees   NUMERIC(15,2);

-- 2. Capital Sources: asset_type for pension/provident fund migration
ALTER TABLE capital_sources
  ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'capital_source';

-- Update existing rows with sensible defaults based on source_type
UPDATE capital_sources SET asset_type = source_type WHERE asset_type IS NULL OR asset_type = 'capital_source';
