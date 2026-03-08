-- ============================================================
-- FILE: supabase/migrations/002_rls.sql
-- PURPOSE: RLS helper functions + all Row Level Security policies
-- RUN ORDER: 2 of 3 (after 001_schema.sql)
-- PROJECT: The Investment Academy
--
-- ROLE MATRIX:
--   super_admin → full CRUD on all tables
--   analyst     → SELECT / INSERT / UPDATE for assigned clients only
--                 ZERO DELETE permissions (enforced by omission)
--   client      → SELECT / INSERT / UPDATE own data only
--                 ZERO DELETE permissions (enforced by omission)
-- ============================================================


-- ============================================================
-- HELPER FUNCTIONS (security definer — run as function owner,
-- not as calling user, preventing privilege escalation)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_analyst()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'analyst'
  );
$$;

-- Returns TRUE if the given client_id is assigned to the current analyst
CREATE OR REPLACE FUNCTION public.is_my_client(client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = client_id AND analyst_id = auth.uid()
  );
$$;


-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_bank            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_investments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_banking_tokens  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- TABLE: profiles
-- ============================================================

-- Super admin: full access
CREATE POLICY "profiles_super_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_super_admin());

-- Analyst: see own profile + assigned clients
CREATE POLICY "profiles_analyst_select"
  ON public.profiles FOR SELECT
  USING (
    public.is_analyst() AND (
      id = auth.uid() OR analyst_id = auth.uid()
    )
  );

-- Analyst: create new client profiles
CREATE POLICY "profiles_analyst_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_analyst());

-- Analyst: update own profile or assigned clients
CREATE POLICY "profiles_analyst_update"
  ON public.profiles FOR UPDATE
  USING (
    public.is_analyst() AND (
      id = auth.uid() OR analyst_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_analyst() AND (
      id = auth.uid() OR analyst_id = auth.uid()
    )
  );

-- Client: see and update own profile only
CREATE POLICY "profiles_client_select"
  ON public.profiles FOR SELECT
  USING (public.get_user_role() = 'client' AND id = auth.uid());

CREATE POLICY "profiles_client_update"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'client' AND id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND id = auth.uid());


-- ============================================================
-- TABLE: budget_categories (global — read-only for non-admins)
-- ============================================================

CREATE POLICY "budget_categories_super_admin_all"
  ON public.budget_categories FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "budget_categories_authenticated_select"
  ON public.budget_categories FOR SELECT
  USING (auth.uid() IS NOT NULL AND NOT public.is_super_admin());


-- ============================================================
-- TABLE: budgets
-- ============================================================

CREATE POLICY "budgets_super_admin_all"
  ON public.budgets FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "budgets_analyst_select"
  ON public.budgets FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "budgets_analyst_insert"
  ON public.budgets FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "budgets_analyst_update"
  ON public.budgets FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "budgets_client_select"
  ON public.budgets FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "budgets_client_insert"
  ON public.budgets FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "budgets_client_update"
  ON public.budgets FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: transactions
-- ============================================================

CREATE POLICY "transactions_super_admin_all"
  ON public.transactions FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "transactions_analyst_select"
  ON public.transactions FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "transactions_analyst_insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "transactions_analyst_update"
  ON public.transactions FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "transactions_client_select"
  ON public.transactions FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "transactions_client_insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "transactions_client_update"
  ON public.transactions FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: task_bank (global — read-only for non-admins)
-- ============================================================

CREATE POLICY "task_bank_super_admin_all"
  ON public.task_bank FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "task_bank_authenticated_select"
  ON public.task_bank FOR SELECT
  USING (auth.uid() IS NOT NULL AND NOT public.is_super_admin());


-- ============================================================
-- TABLE: client_tasks
-- ============================================================

CREATE POLICY "client_tasks_super_admin_all"
  ON public.client_tasks FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "client_tasks_analyst_select"
  ON public.client_tasks FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "client_tasks_analyst_insert"
  ON public.client_tasks FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "client_tasks_analyst_update"
  ON public.client_tasks FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

-- Clients can only check off tasks (UPDATE is_completed), not delete or create them
CREATE POLICY "client_tasks_client_select"
  ON public.client_tasks FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "client_tasks_client_update"
  ON public.client_tasks FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: goals
-- ============================================================

CREATE POLICY "goals_super_admin_all"
  ON public.goals FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "goals_analyst_select"
  ON public.goals FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "goals_analyst_insert"
  ON public.goals FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "goals_analyst_update"
  ON public.goals FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "goals_client_select"
  ON public.goals FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "goals_client_insert"
  ON public.goals FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "goals_client_update"
  ON public.goals FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: assets
-- ============================================================

CREATE POLICY "assets_super_admin_all"
  ON public.assets FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "assets_analyst_select"
  ON public.assets FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "assets_analyst_insert"
  ON public.assets FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "assets_analyst_update"
  ON public.assets FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "assets_client_select"
  ON public.assets FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "assets_client_insert"
  ON public.assets FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "assets_client_update"
  ON public.assets FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: liabilities
-- ============================================================

CREATE POLICY "liabilities_super_admin_all"
  ON public.liabilities FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "liabilities_analyst_select"
  ON public.liabilities FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "liabilities_analyst_insert"
  ON public.liabilities FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "liabilities_analyst_update"
  ON public.liabilities FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "liabilities_client_select"
  ON public.liabilities FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "liabilities_client_insert"
  ON public.liabilities FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "liabilities_client_update"
  ON public.liabilities FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: properties
-- ============================================================

CREATE POLICY "properties_super_admin_all"
  ON public.properties FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "properties_analyst_select"
  ON public.properties FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "properties_analyst_insert"
  ON public.properties FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "properties_analyst_update"
  ON public.properties FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "properties_client_select"
  ON public.properties FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "properties_client_insert"
  ON public.properties FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "properties_client_update"
  ON public.properties FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: active_investments
-- ============================================================

CREATE POLICY "active_investments_super_admin_all"
  ON public.active_investments FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "active_investments_analyst_select"
  ON public.active_investments FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "active_investments_analyst_insert"
  ON public.active_investments FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "active_investments_analyst_update"
  ON public.active_investments FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "active_investments_client_select"
  ON public.active_investments FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "active_investments_client_insert"
  ON public.active_investments FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "active_investments_client_update"
  ON public.active_investments FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: contacts (global directory — read-only for non-admins)
-- ============================================================

CREATE POLICY "contacts_super_admin_all"
  ON public.contacts FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "contacts_authenticated_select"
  ON public.contacts FOR SELECT
  USING (auth.uid() IS NOT NULL AND NOT public.is_super_admin());


-- ============================================================
-- TABLE: processes
-- ============================================================

CREATE POLICY "processes_super_admin_all"
  ON public.processes FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "processes_analyst_select"
  ON public.processes FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "processes_analyst_insert"
  ON public.processes FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "processes_analyst_update"
  ON public.processes FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

-- Clients: read-only access to their own process
CREATE POLICY "processes_client_select"
  ON public.processes FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: meeting_summaries
-- ============================================================

CREATE POLICY "meeting_summaries_super_admin_all"
  ON public.meeting_summaries FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "meeting_summaries_analyst_select"
  ON public.meeting_summaries FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "meeting_summaries_analyst_insert"
  ON public.meeting_summaries FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "meeting_summaries_analyst_update"
  ON public.meeting_summaries FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

-- Clients: read-only access to their own meeting summaries
CREATE POLICY "meeting_summaries_client_select"
  ON public.meeting_summaries FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());


-- ============================================================
-- TABLE: documents
-- ============================================================

CREATE POLICY "documents_super_admin_all"
  ON public.documents FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "documents_analyst_select"
  ON public.documents FOR SELECT
  USING (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "documents_analyst_insert"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

CREATE POLICY "documents_analyst_update"
  ON public.documents FOR UPDATE
  USING (public.is_analyst() AND public.is_my_client(user_id))
  WITH CHECK (public.is_analyst() AND public.is_my_client(user_id));

-- Clients: see own documents + can upload their own
CREATE POLICY "documents_client_select"
  ON public.documents FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "documents_client_insert"
  ON public.documents FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'client' AND
    user_id = auth.uid() AND
    uploaded_by = auth.uid()
  );


-- ============================================================
-- TABLE: videos (VOD — read-only for non-admins)
-- ============================================================

CREATE POLICY "videos_super_admin_all"
  ON public.videos FOR ALL
  USING (public.is_super_admin());

-- Only show published videos to non-admins
CREATE POLICY "videos_authenticated_select"
  ON public.videos FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_published = TRUE AND NOT public.is_super_admin());


-- ============================================================
-- TABLE: open_banking_tokens
-- Analysts have ZERO access — tokens belong strictly to the client.
-- ============================================================

CREATE POLICY "obt_super_admin_all"
  ON public.open_banking_tokens FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "obt_client_select"
  ON public.open_banking_tokens FOR SELECT
  USING (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "obt_client_insert"
  ON public.open_banking_tokens FOR INSERT
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());

CREATE POLICY "obt_client_update"
  ON public.open_banking_tokens FOR UPDATE
  USING (public.get_user_role() = 'client' AND user_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'client' AND user_id = auth.uid());
