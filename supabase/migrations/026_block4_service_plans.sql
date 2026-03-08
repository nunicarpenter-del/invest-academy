-- Block 4: Service Plans + Notification Log + profiles.is_premium

-- Service plans (admin-managed)
CREATE TABLE IF NOT EXISTS service_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name       TEXT NOT NULL,
  total_sessions  INT  NOT NULL DEFAULT 12,
  start_date      DATE NOT NULL,
  end_date        DATE,
  is_active       BOOLEAN DEFAULT true,
  created_by      uuid REFERENCES auth.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE service_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_own" ON service_plans USING (user_id = auth.uid());

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('meeting_reminder','engagement_nudge','welcome','upgrade_prompt')),
  message      TEXT NOT NULL,
  channel      TEXT NOT NULL CHECK (channel IN ('email','whatsapp','in_app')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  triggered_by TEXT NOT NULL DEFAULT 'admin' CHECK (triggered_by IN ('system','admin')),
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON notification_log USING (user_id = auth.uid());

-- Add is_premium to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
