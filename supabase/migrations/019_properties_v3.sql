-- Properties: smart equity & funding fields
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS residence_status            TEXT,         -- 'first_apartment' | 'alternative_apartment' | 'second_apartment'
  ADD COLUMN IF NOT EXISTS payment_terms               TEXT,         -- '5/95' | '10/90' | '15/85' | '20/80'
  ADD COLUMN IF NOT EXISTS linked_property_to_sell_id  UUID REFERENCES properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completion_amount           NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS sell_by_date                DATE;         -- alternative_apartment: delivery + 12 months

-- Professional Directory (admin-managed; clients read-only)
CREATE TABLE IF NOT EXISTS professional_directory (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role       TEXT        NOT NULL,   -- 'broker' | 'lawyer' | 'analyst' | 'contractor' | 'other'
  name       TEXT        NOT NULL,
  phone      TEXT,
  email      TEXT,
  company    TEXT,
  region     TEXT        DEFAULT 'all',
  notes      TEXT,
  active     BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE professional_directory ENABLE ROW LEVEL SECURITY;

-- Admins: full access
DROP POLICY IF EXISTS "Admin full access on professional_directory" ON professional_directory;
CREATE POLICY "Admin full access on professional_directory"
  ON professional_directory FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Authenticated users: read active entries
DROP POLICY IF EXISTS "Read active professional directory" ON professional_directory;
CREATE POLICY "Read active professional directory"
  ON professional_directory FOR SELECT
  USING (auth.role() = 'authenticated' AND active = true);
