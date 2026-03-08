import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InsuranceClient from '@/components/dashboard/InsuranceClient'

export default async function InsurancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: policies }, { data: loans }] = await Promise.all([
    supabase
      .from('insurance_policies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('loans')
      .select('remaining_balance')
      .eq('user_id', user.id),
  ])

  const totalDebt = (loans ?? []).reduce((s, l) => s + (l.remaining_balance ?? 0), 0)

  return (
    <InsuranceClient
      policies={policies ?? []}
      totalDebt={totalDebt}
    />
  )
}
