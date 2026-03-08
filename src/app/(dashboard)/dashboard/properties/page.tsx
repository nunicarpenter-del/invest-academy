import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PropertiesClient from '@/components/dashboard/PropertiesClient'

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch all property columns (v2 + v3 + technical fields)
  const { data: properties } = await supabase
    .from('properties')
    .select(`
      id, name, address, property_type,
      current_value, mortgage_outstanding, mortgage_monthly_payment,
      monthly_rent, other_expenses,
      total_cost, contract_price, closing_fees,
      purchase_date, target_exit_date, expected_sale_amount,
      ownership_percentage, developer, expense_items,
      initial_equity, delivery_equity, completion_funding_source,
      funding_pension_account_id, overseas_region, overseas_location,
      professionals, created_at,
      residence_status, payment_terms,
      linked_property_to_sell_id, completion_amount, sell_by_date,
      property_city, rooms, floor, total_size_sqm, balcony_size_sqm,
      has_parking, has_storage, gush, chelka, ownership_type, estimated_market_value
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch pension accounts for funding selector
  const { data: pensionRows } = await supabase
    .from('pension_accounts')
    .select('id, name, account_type, balance, maturity_date')
    .eq('user_id', user.id)
    .order('name')

  // Fetch capital sources — map to same PensionRef shape for the selector
  const { data: capitalRows } = await supabase
    .from('capital_sources')
    .select('id, name, source_type, current_balance')
    .eq('user_id', user.id)
    .order('name')

  // Combined pension + capital list for funding selector and empty-board check
  const pensionAccounts = [
    ...(pensionRows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      account_type: r.account_type,
      balance: r.balance,
      maturity_date: r.maturity_date,
    })),
    ...(capitalRows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      account_type: r.source_type,
      balance: r.current_balance,
      maturity_date: null as string | null,
    })),
  ]

  // Fetch user profile for role-based features
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = userProfile?.role ?? 'client'

  // Fetch professional directory (graceful fallback if table not yet created)
  const { data: dirData } = await supabase
    .from('professional_directory')
    .select('id, role, name, phone, company')
    .eq('active', true)
    .order('role')

  const professionalDirectory = dirData ?? []

  // Compute net cash flow
  const propertyNetFlow = (properties ?? []).reduce((sum, p) => {
    return sum + (p.monthly_rent ?? 0) - (p.mortgage_monthly_payment ?? 0) - (p.other_expenses ?? 0)
  }, 0)

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: txns } = await supabase
    .from('cash_flow_transactions')
    .select('flow_type, amount')
    .eq('user_id', user.id)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const txnNetFlow = (txns ?? []).reduce((sum, tx) => {
    return sum + (tx.flow_type === 'income' ? (tx.amount ?? 0) : -(tx.amount ?? 0))
  }, 0)

  const { data: allTxnTypes } = await supabase
    .from('cash_flow_transactions')
    .select('flow_type')
    .eq('user_id', user.id)

  const hasTxnIncome   = (allTxnTypes ?? []).some((tx) => tx.flow_type === 'income')
  const hasTxnExpenses = (allTxnTypes ?? []).some((tx) => tx.flow_type === 'expense')

  const hasPropIncome   = (properties ?? []).some((p) => (p.monthly_rent ?? 0) > 0)
  const hasPropExpenses = (properties ?? []).some((p) =>
    (p.mortgage_monthly_payment ?? 0) > 0 || (p.other_expenses ?? 0) > 0
  )

  const hasCashFlowIncome   = hasTxnIncome   || hasPropIncome
  const hasCashFlowExpenses = hasTxnExpenses || hasPropExpenses

  return (
    <PropertiesClient
      properties={properties ?? []}
      netCashFlow={propertyNetFlow + txnNetFlow}
      pensionAccounts={pensionAccounts}
      userRole={userRole}
      professionalDirectory={professionalDirectory}
      hasCashFlowIncome={hasCashFlowIncome}
      hasCashFlowExpenses={hasCashFlowExpenses}
    />
  )
}
