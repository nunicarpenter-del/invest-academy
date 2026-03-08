-- ============================================================
-- FILE: supabase/migrations/017_academy.sql
-- PURPOSE: User video progress tracking for Academy/VOD feature.
--          Also adds useful indexes on videos table.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. VIDEO PROGRESS TRACKING
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_video_progress (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id   UUID        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed  BOOLEAN     NOT NULL DEFAULT false,
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.user_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_video_progress"
  ON public.user_video_progress FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS uvp_user_id_idx  ON public.user_video_progress (user_id);
CREATE INDEX IF NOT EXISTS uvp_video_id_idx ON public.user_video_progress (video_id);

-- ─────────────────────────────────────────────────────────────
-- 2. VIDEOS TABLE — additional useful indexes
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS videos_category_idx      ON public.videos (category);
CREATE INDEX IF NOT EXISTS videos_published_idx     ON public.videos (is_published);
CREATE INDEX IF NOT EXISTS videos_display_order_idx ON public.videos (display_order);

-- ─────────────────────────────────────────────────────────────
-- 3. ENSURE VIDEOS RLS IS ACTIVE
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Drop & recreate to ensure correct policy (idempotent)
DROP POLICY IF EXISTS "videos_authenticated_select" ON public.videos;
CREATE POLICY "videos_authenticated_select"
  ON public.videos FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_published = TRUE);

-- ─────────────────────────────────────────────────────────────
-- 4. CLIENT_TASKS RLS (ensure users can read their own tasks)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_client_tasks" ON public.client_tasks;
CREATE POLICY "users_own_client_tasks"
  ON public.client_tasks FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow reading task_bank (public reference data)
ALTER TABLE public.task_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_bank_authenticated_select" ON public.task_bank;
CREATE POLICY "task_bank_authenticated_select"
  ON public.task_bank FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);
