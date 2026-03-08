-- 025_insurance.sql
-- Insurance & Protection Board

CREATE TABLE IF NOT EXISTS insurance_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('life','health','property','critical_illness','loss_of_income')),
  provider        TEXT,
  monthly_premium NUMERIC(10,2),
  coverage_amount NUMERIC(15,2),
  start_date      DATE,
  end_date        DATE,
  beneficiary     TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'insurance_policies' AND policyname = 'insurance_own'
  ) THEN
    CREATE POLICY "insurance_own" ON insurance_policies
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
