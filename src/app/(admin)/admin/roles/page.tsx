import { createAdminClient } from '@/lib/supabase/admin'
import RolesManagerClient from '@/components/admin/RolesManagerClient'
import { AlertTriangle } from 'lucide-react'

export default async function AdminRolesPage() {
  let supabase: ReturnType<typeof createAdminClient>
  try { supabase = createAdminClient() } catch (e) {
    return (
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-semibold text-[#F0EDE8]">הרשאות ותפקידים</h1>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300">{e instanceof Error ? e.message : 'שגיאת תצורה'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { data: rules } = await supabase
    .from('role_email_rules')
    .select('id, pattern, role, description, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-[#F0EDE8]">הרשאות ותפקידים</h1>
        <p className="mt-0.5 text-sm text-[#86968B]">הגדרת תפקידים אוטומטית לפי תבנית אימייל</p>
      </div>
      <RolesManagerClient rules={rules ?? []} />
    </div>
  )
}
