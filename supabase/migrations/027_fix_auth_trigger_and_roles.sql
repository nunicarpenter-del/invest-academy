-- ============================================================
-- 027_fix_auth_trigger_and_roles.sql
--
-- Fixes three compounding bugs:
--
-- 1. handle_new_user trigger — no ON CONFLICT clause.
--    During Supabase GoTrue's password-recovery flow, the trigger
--    can fire a second time for an already-existing profile, causing
--    a PRIMARY KEY violation → AuthApiError: Database error.
--
-- 2. profiles.role CHECK constraint only allows
--    ('super_admin','analyst','client') but every code path checks
--    role = 'admin'.  Admin users cannot be created or updated while
--    this constraint exists.
--
-- 3. professional_directory RLS policy references role = 'admin',
--    which the old constraint blocks — making the table inaccessible
--    to admins.
--
-- FULLY IDEMPOTENT — safe to run multiple times.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Make handle_new_user safe against duplicate triggers
-- ─────────────────────────────────────────────────────────────
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
  )
  ON CONFLICT (id) DO NOTHING;   -- silently skip if profile already exists
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 2. Expand profiles.role CHECK to include 'admin'
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'analyst', 'client'));


-- ─────────────────────────────────────────────────────────────
-- 3. Fix professional_directory admin policy
--    (was referencing 'admin' which the old constraint blocked)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin full access on professional_directory"
  ON public.professional_directory;

CREATE POLICY "Admin full access on professional_directory"
  ON public.professional_directory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 4. Back-fill: ensure every auth user already in the system
--    has a matching profile row (guards against any past trigger
--    failures that left orphaned auth.users rows)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email)
SELECT au.id, au.email
FROM   auth.users au
WHERE  NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;
