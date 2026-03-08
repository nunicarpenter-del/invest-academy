import { createAdminClient } from '@/lib/supabase/admin'
import UsersTableClient from '@/components/admin/UsersTableClient'
import { AlertTriangle } from 'lucide-react'

export default async function AdminUsersPage() {
  let supabase: ReturnType<typeof createAdminClient>
  try { supabase = createAdminClient() } catch (e) {
    return (
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-semibold text-[#F0EDE8]">ניהול משתמשים</h1>
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

  const [{ data: stats }, { data: taskBank }, { data: agents }] = await Promise.all([
    supabase.from('user_stats').select('*').order('full_name'),
    supabase.from('task_bank').select('id, title, difficulty').order('title'),
    supabase.from('profiles').select('id, full_name').eq('role', 'partner').order('full_name'),
  ])

  const users = (stats ?? []).map(s => ({
    id:          s.id as string,
    full_name:   s.full_name as string | null,
    role:        s.role as string | null,
    agent_id:    s.agent_id as string | null,
    agent_name:  s.agent_name as string | null,
    totalXP:     (s.total_xp as number) ?? 0,
    level:       (s.level as number) ?? 1,
    last_login:  s.last_login as string | null,
    session_min: (s.session_min as number) ?? 0,
  }))

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-[#F0EDE8]">ניהול משתמשים</h1>
        <p className="mt-0.5 text-sm text-[#86968B]">
          {users.length} {users.length === 1 ? 'חבר' : 'חברים'}
        </p>
      </div>
      <UsersTableClient users={users} taskBank={taskBank ?? []} agents={agents ?? []} />
    </div>
  )
}
