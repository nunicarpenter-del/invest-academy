import { createAdminClient } from '@/lib/supabase/admin'
import { fmtMin, roleStyle, roleLabel } from '@/lib/admin-utils'
import { Users2, Zap, Video, ClipboardList, AlertTriangle, Clock, UserCheck } from 'lucide-react'

function MissingKeyBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-300">לקוח Admin אינו מוגדר</p>
          <p className="text-xs text-amber-400/80">{message}</p>
          <p className="mt-2 rounded-lg bg-[#101A26] px-3 py-2 font-mono text-xs text-[#C8AA8F]">
            הוסף ל‑.env.local:<br />
            SUPABASE_SERVICE_ROLE_KEY=your_key_here
          </p>
        </div>
      </div>
    </div>
  )
}

export default async function AdminOverviewPage() {
  let supabase: ReturnType<typeof createAdminClient>
  try { supabase = createAdminClient() } catch (e) {
    return (
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-semibold text-[#F0EDE8]">סקירה כללית</h1>
        <MissingKeyBanner message={e instanceof Error ? e.message : String(e)} />
      </div>
    )
  }

  const results = await Promise.allSettled([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('user_xp_events').select('xp_amount'),
    supabase.from('user_xp_events').select('*', { count: 'exact', head: true }).eq('event_type', 'video_completed'),
    supabase.from('client_tasks').select('*', { count: 'exact', head: true }).eq('is_completed', false),
    supabase.from('profiles').select('id, full_name, role').limit(20),
    // Activity stats (graceful if table doesn't exist)
    supabase.from('user_activity_log').select('user_id, event_type, created_at').eq('event_type', 'page_view'),
    supabase.from('profiles').select('id, full_name').eq('role', 'partner'),
  ])

  const totalUsers       = results[0].status === 'fulfilled' ? (results[0].value.count ?? 0) : 0
  const xpData           = results[1].status === 'fulfilled' ? (results[1].value.data ?? []) : []
  const videoCompletions = results[2].status === 'fulfilled' ? (results[2].value.count ?? 0) : 0
  const activeTasks      = results[3].status === 'fulfilled' ? (results[3].value.count ?? 0) : 0
  const members          = results[4].status === 'fulfilled' ? (results[4].value.data ?? []) : []
  const pageViews        = results[5].status === 'fulfilled' ? (results[5].value.data ?? []) : []
  const partners         = results[6].status === 'fulfilled' ? (results[6].value.data ?? []) : []

  const totalXP = xpData.reduce((sum, e) => sum + (e.xp_amount ?? 0), 0)

  // Avg session time: estimate 2 min per page view, average across users
  const viewsByUser = new Map<string, number>()
  for (const v of pageViews) viewsByUser.set(v.user_id, (viewsByUser.get(v.user_id) ?? 0) + 1)
  const avgViewsPerUser = viewsByUser.size > 0 ? [...viewsByUser.values()].reduce((a, b) => a + b, 0) / viewsByUser.size : 0
  const avgSessionMin = Math.round(avgViewsPerUser * 2)

  const STATS = [
    { label: 'סה״כ חברים',          value: totalUsers,                  icon: Users2,       color: 'text-[#C8AA8F]' },
    { label: 'סה״כ XP שחולק',        value: totalXP.toLocaleString(),    icon: Zap,          color: 'text-emerald-400' },
    { label: 'סרטונים שהושלמו',      value: videoCompletions,            icon: Video,        color: 'text-blue-400' },
    { label: 'משימות פעילות',         value: activeTasks,                 icon: ClipboardList, color: 'text-amber-400' },
    { label: 'זמן שהייה ממוצע',      value: avgSessionMin > 0 ? fmtMin(avgSessionMin) : '—', icon: Clock, color: 'text-purple-400' },
    { label: 'סוכנים פעילים',         value: partners.length,             icon: UserCheck,    color: 'text-rose-400' },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-[#F0EDE8]">סקירה כללית</h1>
        <p className="mt-0.5 text-sm text-[#86968B]">סטטיסטיקות פלטפורמה</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-[#2C3B38] bg-[#20302F] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#445147]">{label}</p>
              <Icon size={15} className={color} />
            </div>
            <p className={`mt-3 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-[#2C3B38] bg-[#20302F]">
        <div className="border-b border-[#2C3B38] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#F0EDE8]">חברים אחרונים</h2>
        </div>
        <div className="divide-y divide-[#2C3B38]">
          {members.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-[#445147]">אין חברים עדיין.</p>
          )}
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C3B38] text-xs font-medium text-[#C8AA8F]">
                {(m.full_name ?? '?')[0]?.toUpperCase()}
              </div>
              <p className="flex-1 truncate text-sm text-[#F0EDE8]">{m.full_name ?? 'לא ידוע'}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleStyle(m.role)}`}>
                {roleLabel(m.role)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
