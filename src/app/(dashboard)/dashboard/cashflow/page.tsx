import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CashFlowClient from '@/components/dashboard/CashFlowClient'

const PROJECT_TYPES = ['pinui_binui', 'first_hand', 'purchase_group']

export default async function CashFlowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: properties }, { data: transactions }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, monthly_rent, mortgage_monthly_payment, other_expenses')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('cash_flow_transactions')
      .select('id, property_id, transaction_type, flow_type, category, amount, date, notes, bank_account')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
  ])

  // Project properties with monthly-savings funding — for Analyst Panel validation
  const { data: projectPropsRaw } = await supabase
    .from('properties')
    .select('id, name, completion_amount, delivery_equity, target_exit_date, completion_funding_source')
    .eq('user_id', user.id)
    .eq('completion_funding_source', 'monthly_savings')
    .in('property_type', PROJECT_TYPES)

  const projectProperties = projectPropsRaw ?? []

  // Data-completeness flags: does the user have income AND expense data?
  const hasTxnIncome   = (transactions ?? []).some((tx) => tx.flow_type === 'income')
  const hasTxnExpenses = (transactions ?? []).some((tx) => tx.flow_type === 'expense')
  const hasPropIncome   = (properties ?? []).some((p) => (p.monthly_rent ?? 0) > 0)
  const hasPropExpenses = (properties ?? []).some((p) =>
    (p.mortgage_monthly_payment ?? 0) > 0 || (p.other_expenses ?? 0) > 0
  )

  const hasCashFlowIncome   = hasTxnIncome   || hasPropIncome
  const hasCashFlowExpenses = hasTxnExpenses || hasPropExpenses

  return (
    <CashFlowClient
      properties={properties ?? []}
      transactions={transactions ?? []}
      projectProperties={projectProperties}
      hasCashFlowIncome={hasCashFlowIncome}
      hasCashFlowExpenses={hasCashFlowExpenses}
    />
  )
}
