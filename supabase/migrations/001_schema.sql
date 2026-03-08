-- ============================================================
-- FILE: supabase/migrations/001_schema.sql
-- PURPOSE: Extensions, enums, tables, triggers, indexes
-- RUN ORDER: 1 of 3
-- PROJECT: The Investment Academy
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for future open_banking_tokens encryption


-- ------------------------------------------------------------
-- SHARED: updated_at trigger function
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ============================================================
-- TABLE 1: profiles (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'client'
                              CHECK (role IN ('super_admin', 'analyst', 'client')),
  full_name       TEXT,
  email           TEXT        UNIQUE,
  phone           TEXT,
  analyst_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  process_type    TEXT,
  process_status  TEXT        NOT NULL DEFAULT 'active'
                              CHECK (process_status IN ('active', 'alumni')),
  onboarding_data JSONB,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- TABLE 2: budget_categories (global, admin-managed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  name_he       TEXT,                          -- Hebrew display name
  icon          TEXT,                          -- icon slug for UI
  display_order INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE 3: budgets (client-defined monthly limits)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id  UUID         NOT NULL REFERENCES public.budget_categories(id),
  month_year   DATE         NOT NULL, -- stored as first day of month: 2025-01-01
  limit_amount NUMERIC(15,2) NOT NULL CHECK (limit_amount >= 0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, month_year)
);

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 4: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id      UUID         REFERENCES public.budget_categories(id),
  amount           NUMERIC(15,2) NOT NULL,
  description      TEXT,
  merchant         TEXT,
  transaction_date DATE         NOT NULL,
  source           TEXT         NOT NULL DEFAULT 'manual'
                                CHECK (source IN ('manual', 'csv', 'open_banking')),
  external_id      TEXT,        -- deduplication key for Open Banking imports
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE 5: task_bank (admin-created habits library)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_bank (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  category    TEXT,
  difficulty  TEXT        CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by  UUID        REFERENCES public.profiles(id),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE 6: client_tasks (AI-assigned tasks per client)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id     UUID        NOT NULL REFERENCES public.task_bank(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN    NOT NULL DEFAULT FALSE,
  notes       TEXT
);


-- ============================================================
-- TABLE 7: goals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           TEXT         NOT NULL,
  target_amount  NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  target_date    DATE         NOT NULL,  -- first day of target month
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 8: assets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type       TEXT         NOT NULL
                                CHECK (asset_type IN ('capital_markets', 'crypto', 'pension', 'other')),
  name             TEXT         NOT NULL,
  institution      TEXT,
  current_value    NUMERIC(15,2) NOT NULL,
  currency         TEXT         NOT NULL DEFAULT 'ILS',
  pension_xml_data JSONB,       -- future: structured Mislaka Pensyonit XML data
  notes            TEXT,
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 9: liabilities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.liabilities (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                 TEXT         NOT NULL,
  liability_type       TEXT         NOT NULL
                                    CHECK (liability_type IN ('loan', 'mortgage', 'credit', 'other')),
  outstanding_principal NUMERIC(15,2) NOT NULL,
  original_amount      NUMERIC(15,2),
  interest_rate        NUMERIC(6,4),
  monthly_payment      NUMERIC(15,2),
  start_date           DATE,
  end_date             DATE,
  currency             TEXT         NOT NULL DEFAULT 'ILS',
  notes                TEXT,
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_liabilities_updated_at
  BEFORE UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 10: properties
-- ============================================================
CREATE TABLE IF NOT EXISTS public.properties (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                     TEXT         NOT NULL,
  address                  TEXT,
  property_type            TEXT         NOT NULL
                                        CHECK (property_type IN ('yielding', 'primary_residence')),
  status                   TEXT         CHECK (status IN (
                                          'rented', 'vacant', 'renovating',
                                          'in_eviction', 'listed_for_sale', 'primary_residence'
                                        )),
  current_value            NUMERIC(15,2) NOT NULL,
  purchase_price           NUMERIC(15,2),
  purchase_date            DATE,
  monthly_rent             NUMERIC(15,2),
  mortgage_outstanding     NUMERIC(15,2) NOT NULL DEFAULT 0,
  mortgage_monthly_payment NUMERIC(15,2),
  mortgage_interest_rate   NUMERIC(6,4),
  mortgage_end_date        DATE,
  currency                 TEXT         NOT NULL DEFAULT 'ILS',
  notes                    TEXT,
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 11: active_investments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.active_investments (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              TEXT         NOT NULL,
  investment_type   TEXT         NOT NULL
                                 CHECK (investment_type IN (
                                   'real_estate', 'fund', 'entrepreneurial', 'land', 'other'
                                 )),
  status            TEXT         NOT NULL
                                 CHECK (status IN (
                                   'pre_sale', 'awaiting_permits', 'under_construction',
                                   'nearing_delivery', 'capital_called', 'capital_deployed',
                                   'waiting_for_exit', 'exit_process'
                                 )),
  capital_invested  NUMERIC(15,2) NOT NULL,
  expected_exit_date DATE,
  expected_roi      NUMERIC(8,4), -- percentage, e.g. 12.5 = 12.5%
  developer_name    TEXT,
  developer_contact TEXT,
  currency          TEXT         NOT NULL DEFAULT 'ILS',
  notes             TEXT,
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_active_investments_updated_at
  BEFORE UPDATE ON public.active_investments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 12: contacts (global service provider directory)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT        NOT NULL,
  profession      TEXT        NOT NULL, -- 'lawyer', 'mortgage_broker', 'cpa', 'notary', etc.
  firm            TEXT,
  phone           TEXT,
  email           TEXT,
  whatsapp_number TEXT,
  process_types   TEXT[],     -- which process types unlock this contact
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE 13: processes (advisory process per client)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  process_type   TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'completed', 'alumni')),
  total_meetings INTEGER     NOT NULL,
  meetings_used  INTEGER     NOT NULL DEFAULT 0,
  started_at     DATE,
  ended_at       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_processes_updated_at
  BEFORE UPDATE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 14: meeting_summaries (synced from Monday.com)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  process_id     UUID        REFERENCES public.processes(id),
  monday_item_id TEXT        UNIQUE, -- deduplication key from Monday.com webhooks
  title          TEXT,
  content        TEXT        NOT NULL,
  meeting_date   DATE,
  analyst_id     UUID        REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_meeting_summaries_updated_at
  BEFORE UPDATE ON public.meeting_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- TABLE 15: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by    UUID        NOT NULL REFERENCES public.profiles(id),
  file_name      TEXT        NOT NULL,
  file_path      TEXT        NOT NULL, -- Supabase Storage path: {user_id}/{filename}
  mime_type      TEXT,
  file_size_bytes INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE 16: videos (VOD Academy)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  category         TEXT,
  video_url        TEXT        NOT NULL,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  display_order    INTEGER     NOT NULL DEFAULT 0,
  is_published     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by       UUID        REFERENCES public.profiles(id),
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE 17: open_banking_tokens (Phase 2 — OAuth tokens only)
-- SECURITY: NEVER stores bank login credentials.
--           Only read-only OAuth access tokens, encrypted at rest.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.open_banking_tokens (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider                TEXT        NOT NULL, -- e.g. 'finanda'
  access_token_encrypted  TEXT        NOT NULL, -- encrypted via pgp_sym_encrypt at app level
  refresh_token_encrypted TEXT,
  expires_at              TIMESTAMPTZ,
  scope                   TEXT,
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_open_banking_tokens_updated_at
  BEFORE UPDATE ON public.open_banking_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- INDEXES (performance on high-frequency query patterns)
-- ============================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_analyst_id    ON public.profiles(analyst_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role           ON public.profiles(role);

-- budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id        ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year     ON public.budgets(month_year);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id         ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date            ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category        ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id     ON public.transactions(external_id);

-- client_tasks
CREATE INDEX IF NOT EXISTS idx_client_tasks_user_id   ON public.client_tasks(user_id);

-- goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id          ON public.goals(user_id);

-- assets / liabilities
CREATE INDEX IF NOT EXISTS idx_assets_user_id         ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id    ON public.liabilities(user_id);

-- properties
CREATE INDEX IF NOT EXISTS idx_properties_user_id     ON public.properties(user_id);

-- active_investments
CREATE INDEX IF NOT EXISTS idx_active_investments_user_id ON public.active_investments(user_id);

-- processes
CREATE INDEX IF NOT EXISTS idx_processes_user_id      ON public.processes(user_id);

-- meeting_summaries
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_user_id       ON public.meeting_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_monday_item   ON public.meeting_summaries(monday_item_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id      ON public.documents(user_id);

-- open_banking_tokens
CREATE INDEX IF NOT EXISTS idx_obt_user_id            ON public.open_banking_tokens(user_id);
