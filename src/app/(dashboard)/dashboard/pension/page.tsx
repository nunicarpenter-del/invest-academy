import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PensionClient from '@/components/dashboard/PensionClient'

export default async function PensionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: accounts },
    { data: sources },
    { data: properties },
  ] = await Promise.all([
    supabase
      .from('pension_accounts')
      .select('id, name, account_type, provider, balance, monthly_deposit, yield_percent, start_date, maturity_date, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('capital_sources')
      .select('id, name, source_type, current_balance, estimated_yield, liquidity_date, is_collateral, allocated_to_property_id, allocated_amount, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('properties')
      .select('id, name, property_type, completion_funding_source, completion_amount, delivery_equity, target_exit_date, monthly_rent, mortgage_monthly_payment, other_expenses')
      .eq('user_id', user.id)
      .order('name'),
  ])

  const netCashFlow = (properties ?? []).reduce((sum, p) => {
    return sum + (p.monthly_rent ?? 0) - (p.mortgage_monthly_payment ?? 0) - (p.other_expenses ?? 0)
  }, 0)

  return (
    <PensionClient
      accounts={accounts ?? []}
      sources={sources ?? []}
      properties={(properties ?? []).map((p) => ({
        id:                        p.id,
        name:                      p.name,
        property_type:             p.property_type,
        completion_funding_source: p.completion_funding_source,
        completion_amount:         p.completion_amount,
        delivery_equity:           p.delivery_equity,
        target_exit_date:          p.target_exit_date,
      }))}
      netCashFlow={netCashFlow}
    />
  )
}
