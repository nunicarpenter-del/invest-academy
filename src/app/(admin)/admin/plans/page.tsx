import { createAdminClient } from '@/lib/supabase/admin'
import PlansManagerClient from '@/components/admin/PlansManagerClient'
import { AlertTriangle } from 'lucide-react'

export default async function AdminPlansPage() {
  let supabase: ReturnType<typeof createAdminClient>
  try { supabase = createAdminClient() } catch {
    return (
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-semibold text-[#F0EDE8]">תוכניות שירות</h1>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-300">לקוח Admin אינו מוגדר</p>
              <p className="mt-2 rounded-lg bg-[#101A26] px-3 py-2 font-mono text-xs text-[#C8AA8F]">
                הוסף ל‑.env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [
    { data: clients },
    { data: plans },
    { data: meetings },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('role', 'client')
      .order('full_name'),
    supabase
      .from('service_plans')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('meetings')
      .select('user_id, date_time'),
    supabase
      .from('notification_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-[#F0EDE8]">תוכניות שירות</h1>
        <p className="mt-0.5 text-sm text-[#86968B]">
          {(clients ?? []).length} לקוחות
        </p>
      </div>
      <PlansManagerClient
        clients={clients ?? []}
        plans={plans ?? []}
        meetings={meetings ?? []}
        notifications={notifications ?? []}
      />
    </div>
  )
}
