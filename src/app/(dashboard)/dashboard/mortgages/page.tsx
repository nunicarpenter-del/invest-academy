import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MortgagesClient from '@/components/dashboard/MortgagesClient'

export default async function MortgagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: loans }, { data: properties }] = await Promise.all([
    supabase
      .from('loans')
      .select(`
        id, name, loan_type, lender, linked_property_id,
        original_amount, remaining_balance, start_date, end_date,
        tracks, monthly_payment, exit_points,
        is_index_linked, index_base_rate, notes
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('properties')
      .select('id, name, current_value')
      .eq('user_id', user.id)
      .order('name'),
  ])

  // Total portfolio value for equity gauge
  const totalAssets = (properties ?? []).reduce((s, p) => s + (p.current_value ?? 0), 0)

  return (
    <MortgagesClient
      loans={(loans ?? []).map(l => ({
        ...l,
        tracks:      Array.isArray(l.tracks)      ? l.tracks      : [],
        exit_points: Array.isArray(l.exit_points) ? l.exit_points : [],
      }))}
      properties={(properties ?? []).map(p => ({ id: p.id, name: p.name }))}
      totalAssets={totalAssets}
    />
  )
}
