-- Migration 023: Add technical property fields for CMA engine
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_city          TEXT,
  ADD COLUMN IF NOT EXISTS rooms                  INTEGER,
  ADD COLUMN IF NOT EXISTS floor                  INTEGER,
  ADD COLUMN IF NOT EXISTS total_size_sqm         NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS balcony_size_sqm       NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS has_parking            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_storage            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gush                   TEXT,
  ADD COLUMN IF NOT EXISTS chelka                 TEXT,
  ADD COLUMN IF NOT EXISTS ownership_type         TEXT DEFAULT 'tabu',
  ADD COLUMN IF NOT EXISTS estimated_market_value NUMERIC(15,2);

-- current_value stays (backward compat) but will be set from CMA result going forward
