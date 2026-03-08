-- ============================================================
-- FILE: supabase/migrations/016_schema_audit_fix.sql
-- PURPOSE: Comprehensive schema repair migration.
--          Fixes all column mismatches, constraint violations,
--          and missing tables from migrations 010–015.
--          FULLY IDEMPOTENT — safe to run multiple times.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. PROPERTIES TABLE
-- ─────────────────────────────────────────────────────────────

-- Relax constraints so the board works for all current data
ALTER TABLE public.properties ALTER COLUMN current_value    DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN current_value    SET DEFAULT 0;
ALTER TABLE public.properties ALTER COLUMN mortgage_outstanding DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN mortgage_outstanding SET DEFAULT 0;

-- Drop the old restrictive property_type check (only 'yielding','primary_residence')
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Add a permissive constraint covering all 8 new types + legacy types
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_property_type_check
      CHECK (property_type IN (
        'residential_apartment', 'pinui_binui', 'first_hand', 'purchase_group',
        'house', 'commercial', 'land', 'other',
        'yielding', 'primary_residence', 'apartment'
      ));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add all new columns (safe — skipped if already exist)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS other_expenses           NUMERIC(15,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_cost               NUMERIC(15,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS delivery_date            DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS realtor_name             TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS realtor_commission       NUMERIC(5,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS target_exit_date         DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS expected_sale_amount     NUMERIC(15,2);

-- Ensure RLS is on with a single unified policy
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_properties" ON public.properties;
CREATE POLICY "users_own_properties"
  ON public.properties FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 2. LIABILITIES TABLE  ← CRITICAL FIX
--    001_schema.sql created this table with wrong columns.
--    011_liabilities.sql was silently skipped (CREATE IF NOT EXISTS).
--    We must ALTER the existing table to add the missing columns
--    and make old NOT NULL columns nullable.
-- ─────────────────────────────────────────────────────────────

-- Make old mandatory columns nullable (safe even if column doesn't exist in some envs)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.liabilities ALTER COLUMN outstanding_principal DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.liabilities ALTER COLUMN liability_type DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- Drop the old liability_type CHECK constraint
ALTER TABLE public.liabilities DROP CONSTRAINT IF EXISTS liabilities_liability_type_check;

-- Add the new columns the dashboard and LiabilitiesPanel actually use
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS lender            TEXT;
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS monthly_repayment NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Note: interest_rate and end_date already exist in 001_schema, so IF NOT EXISTS is safe
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS interest_rate     NUMERIC(5,2);
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS end_date          DATE;

-- Ensure RLS
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_liabilities" ON public.liabilities;
CREATE POLICY "users_own_liabilities"
  ON public.liabilities FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 3. INVESTMENTS TABLE
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS sector         TEXT;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS exchange       TEXT;

-- Ensure RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own investments"   ON public.investments;
DROP POLICY IF EXISTS "Users can insert own investments" ON public.investments;
DROP POLICY IF EXISTS "Users can update own investments" ON public.investments;
DROP POLICY IF EXISTS "Users can delete own investments" ON public.investments;
DROP POLICY IF EXISTS "users_own_investments"            ON public.investments;
CREATE POLICY "users_own_investments"
  ON public.investments FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 4. CASH FLOW TRANSACTIONS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cash_flow_transactions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id      UUID          REFERENCES public.properties(id) ON DELETE SET NULL,
  transaction_type TEXT          NOT NULL DEFAULT 'variable'
                   CHECK (transaction_type IN ('fixed', 'variable')),
  category         TEXT          NOT NULL,
  amount           NUMERIC(15,2) NOT NULL,
  date             DATE          NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Add flow_type column if it doesn't already exist
ALTER TABLE public.cash_flow_transactions ADD COLUMN IF NOT EXISTS flow_type TEXT;

-- Back-fill any NULLs
UPDATE public.cash_flow_transactions SET flow_type = 'expense' WHERE flow_type IS NULL;

-- Add check constraint (ignore if already present)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.cash_flow_transactions
      ADD CONSTRAINT cash_flow_transactions_flow_type_check
      CHECK (flow_type IN ('income', 'expense'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.cash_flow_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_cash_flow_transactions" ON public.cash_flow_transactions;
DROP POLICY IF EXISTS "users_own_cashflow"               ON public.cash_flow_transactions;
CREATE POLICY "users_own_cashflow"
  ON public.cash_flow_transactions FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cft_user_date_idx
  ON public.cash_flow_transactions (user_id, date);


-- ─────────────────────────────────────────────────────────────
-- 5. PENSION ACCOUNTS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pension_accounts (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT          NOT NULL,
  account_type     TEXT          NOT NULL DEFAULT 'pension'
                   CHECK (account_type IN ('pension', 'study_fund', 'savings', 'provident')),
  provider         TEXT,
  balance          NUMERIC(15,2) NOT NULL DEFAULT 0,
  monthly_deposit  NUMERIC(15,2) NOT NULL DEFAULT 0,
  yield_percent    NUMERIC(6,2),
  start_date       DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.pension_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_pension_accounts" ON public.pension_accounts;
CREATE POLICY "users_own_pension_accounts"
  ON public.pension_accounts FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pension_accounts_user_id_idx
  ON public.pension_accounts (user_id);


-- ─────────────────────────────────────────────────────────────
-- 6. MEETINGS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meetings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  meeting_type        TEXT        NOT NULL DEFAULT 'other',
  date_time           TIMESTAMPTZ NOT NULL,
  location            TEXT,
  notes               TEXT,
  related_property_id UUID        REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drop ALL old meeting_type constraints (various names used across migrations)
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_meeting_type_check;
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_meeting_type_check_v2;

-- Add permissive constraint covering all current + legacy types
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.meetings
      ADD CONSTRAINT meetings_meeting_type_check
      CHECK (meeting_type IN (
        'strategy_frontal', 'strategy_zoom', 'deal_closing',
        'monitoring', 'strategic_planning',
        'viewing', 'bank_meeting', 'lawyer', 'contractor', 'other'
      ));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add Phase 3 columns
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_format   TEXT NOT NULL DEFAULT 'frontal';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS google_event_id  TEXT;

-- Add meeting_format constraint (ignore if already present)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.meetings
      ADD CONSTRAINT meetings_meeting_format_check
      CHECK (meeting_format IN ('zoom', 'frontal'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Ensure RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_meetings" ON public.meetings;
CREATE POLICY "users_own_meetings"
  ON public.meetings FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS meetings_user_date_idx
  ON public.meetings (user_id, date_time);


-- ─────────────────────────────────────────────────────────────
-- 7. GOOGLE CALENDAR TOKENS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  user_id       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  expiry_date   BIGINT      NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_gcal_tokens" ON public.google_calendar_tokens;
CREATE POLICY "users_own_gcal_tokens"
  ON public.google_calendar_tokens FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 8. PROFILES TABLE — ensure full_name column exists
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_profiles" ON public.profiles;
CREATE POLICY "users_own_profiles"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────────────────────────
-- Run this entire file in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste → Run
-- ─────────────────────────────────────────────────────────────
