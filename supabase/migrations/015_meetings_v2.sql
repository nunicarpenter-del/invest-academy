-- Phase 3: Professional Meeting Flow + Google Calendar support
-- 1. Extend meeting_type to include new professional categories
-- 2. Add meeting_format (zoom / frontal)
-- 3. Add google_event_id for Google Calendar sync
-- 4. Create google_calendar_tokens table for OAuth2 tokens

-- ── Drop old type constraint (keeping data intact) ────────────────────────
ALTER TABLE public.meetings
  DROP CONSTRAINT IF EXISTS meetings_meeting_type_check;

-- ── Extend meeting_type enum via new constraint ───────────────────────────
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_meeting_type_check
  CHECK (meeting_type IN (
    -- Legacy types (backward compat)
    'viewing', 'bank_meeting', 'lawyer', 'contractor', 'other',
    -- New professional types
    'strategy_frontal', 'strategy_zoom',
    'deal_closing', 'monitoring', 'strategic_planning'
  ));

-- ── meeting_format: zoom / frontal (default frontal) ─────────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS meeting_format TEXT NOT NULL DEFAULT 'frontal'
    CHECK (meeting_format IN ('zoom', 'frontal'));

-- ── google_event_id: Google Calendar event id after sync ──────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- ── google_calendar_tokens: stores OAuth2 access + refresh tokens ─────────
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT    NOT NULL,
  refresh_token TEXT,
  expiry_date   BIGINT, -- unix ms
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_google_tokens" ON public.google_calendar_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
