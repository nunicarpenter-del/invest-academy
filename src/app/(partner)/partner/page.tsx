import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtDate } from '@/lib/admin-utils'

export default async function PartnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!['partner', 'admin'].includes(profile?.role ?? '')) redirect('/dashboard')

  let users: {
    id: string
    full_name: string | null
    role: string | null
    total_xp: number
    level: number
    last_login: string | null
  }[] = []

  try {
    const admin = createAdminClient()
    const { data: stats } = await admin
      .from('user_stats')
      .select('id, full_name, role, total_xp, level, last_login')
      .eq('agent_id', user.id)
      .order('full_name')

    users = (stats ?? []).map(s => ({
      id:         s.id as string,
      full_name:  s.full_name as string | null,
      role:       s.role as string | null,
      total_xp:   (s.total_xp as number) ?? 0,
      level:      (s.level as number) ?? 1,
      last_login: s.last_login as string | null,
    }))
  } catch { /* admin client not configured */ }

  const totalXP = users.reduce((s, u) => s + u.total_xp, 0)

  return (
    <div className="min-h-screen bg-[#101A26] p-8" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#F0EDE8]">פורטל סוכן</h1>
            <p className="mt-0.5 text-sm text-[#86968B]">שלום, {profile?.full_name ?? 'סוכן'}</p>
          </div>
          <a href="/dashboard" className="rounded-xl border border-[#2C3B38] px-4 py-2 text-xs text-[#86968B] transition-colors hover:text-[#F0EDE8]">
            לוח הבקרה
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#2C3B38] bg-[#20302F] p-5">
            <p className="text-xs font-medium text-[#445147]">לקוחות משויכים</p>
            <p className="mt-3 text-2xl font-bold text-[#C8AA8F]">{users.length}</p>
          </div>
          <div className="rounded-xl border border-[#2C3B38] bg-[#20302F] p-5">
            <p className="text-xs font-medium text-[#445147]">סה״כ XP (לקוחות)</p>
            <p className="mt-3 text-2xl font-bold text-emerald-400">
              {totalXP.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Users table */}
        <div className="overflow-hidden rounded-xl border border-[#2C3B38] bg-[#20302F]">
          <div className="border-b border-[#2C3B38] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#F0EDE8]">הלקוחות שלי</h2>
          </div>
          {users.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-[#445147]">אין לקוחות משויכים עדיין.</p>
              <p className="mt-1 text-xs text-[#2C3B38]">המנהל ישייך לקוחות לחשבונך.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2C3B38]">
                  {['לקוח', 'רמה', 'סה״כ XP', 'כניסה אחרונה'].map(h => (
                    <th key={h} className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#445147]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C3B38]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#2C3B38]/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C3B38] text-xs font-medium text-[#C8AA8F]">
                          {(u.full_name ?? '?')[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-[#F0EDE8]">{u.full_name ?? 'לא ידוע'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#C8AA8F]">רמה {u.level}</td>
                    <td className="px-5 py-3.5 text-[#86968B]">{u.total_xp.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-xs text-[#86968B]">{fmtDate(u.last_login)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
