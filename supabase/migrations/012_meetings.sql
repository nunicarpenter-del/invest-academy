-- Meetings & Viewings CRM table
CREATE TABLE IF NOT EXISTS public.meetings (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  meeting_type        TEXT        NOT NULL DEFAULT 'other'
                                  CHECK (meeting_type IN ('viewing','bank_meeting','lawyer','contractor','other')),
  date_time           TIMESTAMPTZ NOT NULL,
  location            TEXT,
  notes               TEXT,
  related_property_id UUID        REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_meetings"
  ON public.meetings
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast upcoming-meetings queries
CREATE INDEX IF NOT EXISTS meetings_date_idx
  ON public.meetings (user_id, date_time);
