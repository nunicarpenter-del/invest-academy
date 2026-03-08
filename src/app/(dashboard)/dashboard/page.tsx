import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/DashboardClient'
import type { Liability } from '@/components/dashboard/LiabilitiesPanel'
import type { Meeting } from '@/components/dashboard/MeetingsClient'

const USD_ILS_FALLBACK = 3.65

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Month boundaries
  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd       = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)

  const [
    { data: profile },
    { data: properties },
    { data: txData },
    { data: pensionData },
    { data: investData },
    { data: lastMonthTx },
    { data: liabilitiesData },
    { data: nextMeetingData },
    { data: loansData },
    { data: capitalData },
    { data: servicePlanData },
    { data: allMeetingsData },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, is_premium').eq('id', user.id).single(),

    supabase
      .from('properties')
      .select('current_value, mortgage_outstanding, monthly_rent, mortgage_monthly_payment, other_expenses')
      .eq('user_id', user.id),

    supabase
      .from('cash_flow_transactions')
      .select('amount, flow_type')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .lt('date', monthEnd),

    supabase
      .from('pension_accounts')
      .select('balance')
      .eq('user_id', user.id),

    supabase
      .from('investments')
      .select('asset_type, quantity, purchase_price, currency')
      .eq('user_id', user.id),

    supabase
      .from('cash_flow_transactions')
      .select('amount, flow_type')
      .eq('user_id', user.id)
      .gte('date', lastMonthStart)
      .lt('date', monthStart),

    supabase
      .from('liabilities')
      .select('id, name, lender, total_amount, monthly_repayment, interest_rate, end_date, notes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('meetings')
      .select('id, title, meeting_type, date_time, location')
      .eq('user_id', user.id)
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })
      .limit(1),

    // New: Mortgage & Debt board
    supabase
      .from('loans')
      .select('remaining_balance, loan_type, monthly_payment, tracks')
      .eq('user_id', user.id),

    // New: Capital Sources board
    supabase
      .from('capital_sources')
      .select('current_balance, estimated_yield, liquidity_date')
      .eq('user_id', user.id),

    // Block 4: Service plan
    supabase
      .from('service_plans')
      .select('plan_name, total_sessions, start_date')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Block 4: All meetings for session count
    supabase
      .from('meetings')
      .select('date_time')
      .eq('user_id', user.id),
  ])

  const props   = properties ?? []
  const invRows = investData ?? []

  // ── Real estate ──────────────────────────────────────────────────────────
  const propAssets    = props.reduce((s, p) => s + (p.current_value        ?? 0), 0)
  const mortgageFromProps = props.reduce((s, p) => s + (p.mortgage_outstanding ?? 0), 0)
  const totalRent     = props.reduce((s, p) => s + (p.monthly_rent             ?? 0), 0)
  const totalMortgagePmt = props.reduce((s, p) => s + (p.mortgage_monthly_payment ?? 0), 0)
  const totalOther    = props.reduce((s, p) => s + (p.other_expenses           ?? 0), 0)
  const propertyCount = props.length

  // ── Pension ───────────────────────────────────────────────────────────────
  const pensionAssets = (pensionData ?? []).reduce((s, p) => s + (p.balance ?? 0), 0)

  // ── Investments ───────────────────────────────────────────────────────────
  const toIls = (val: number, cur: string) =>
    cur?.toUpperCase() === 'USD' ? val * USD_ILS_FALLBACK : val

  const stockValue  = invRows
    .filter(r => r.asset_type !== 'crypto')
    .reduce((s, r) => s + toIls((r.quantity ?? 0) * (r.purchase_price ?? 0), r.currency ?? 'ILS'), 0)

  const cryptoValue = invRows
    .filter(r => r.asset_type === 'crypto')
    .reduce((s, r) => s + toIls((r.quantity ?? 0) * (r.purchase_price ?? 0), r.currency ?? 'USD'), 0)

  const portfolioValue = stockValue + cryptoValue

  // ── Loans (Mortgage & Debt board) ─────────────────────────────────────────
  // If the loans table has data, use it as the authoritative debt source.
  // This avoids double-counting with properties.mortgage_outstanding.
  const loansRows     = loansData ?? []
  const totalLoanDebt = loansRows.reduce((s, l) => s + (l.remaining_balance ?? 0), 0)

  // Monthly payment from loans (sum tracks if available, else monthly_payment field)
  const totalLoanMonthly = loansRows.reduce((s, l) => {
    if (l.monthly_payment) return s + l.monthly_payment
    const tracks = Array.isArray(l.tracks) ? l.tracks : []
    return s + tracks.reduce((ts: number, tk: { monthly_payment?: number }) => ts + (tk.monthly_payment ?? 0), 0)
  }, 0)

  // ── Capital Sources ───────────────────────────────────────────────────────
  const capitalSourcesTotal = (capitalData ?? []).reduce((s, c) => s + (c.current_balance ?? 0), 0)
  const capitalLiquid = (capitalData ?? [])
    .filter(c => !c.liquidity_date || new Date(c.liquidity_date) <= now)
    .reduce((s, c) => s + (c.current_balance ?? 0), 0)

  // ── Cash flow ─────────────────────────────────────────────────────────────
  const incomeTxThisMonth  = (txData ?? []).filter(t => t.flow_type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
  const expenseTxThisMonth = (txData ?? []).filter(t => t.flow_type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)

  const totalMonthlyIncome   = totalRent + incomeTxThisMonth
  // Include loan monthly payments in expenses if available
  const totalMonthlyExpenses = totalMortgagePmt + totalOther + expenseTxThisMonth

  const netCashFlow = totalMonthlyIncome - totalMonthlyExpenses

  const lastMonthIncome  = (lastMonthTx ?? []).filter(t => t.flow_type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
  const lastMonthExpense = (lastMonthTx ?? []).filter(t => t.flow_type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)
  const lastMonthNet     = totalRent - totalMortgagePmt - totalOther + lastMonthIncome - lastMonthExpense

  // ── Liabilities (old table — kept for backwards compat) ───────────────────
  const liabilities        = (liabilitiesData ?? []) as Liability[]
  const totalLiabilities   = liabilities.reduce((s, l) => s + l.total_amount,      0)
  const monthlyDebtService = liabilities.reduce((s, l) => s + l.monthly_repayment, 0)

  // ── Total Debt (loans table preferred, fallback to props.mortgage_outstanding) ──
  // If loans table has data, use it (avoids double-count with mortgage_outstanding)
  const authorativeMortgageDebt = totalLoanDebt > 0 ? totalLoanDebt : mortgageFromProps
  const propEquity = propAssets - (totalLoanDebt > 0 ? 0 : mortgageFromProps)
  // Net Worth = all assets − all debt
  // Assets: propAssets (gross) + portfolio + pension + capital sources
  // Debt: loans table (includes mortgages) + old liabilities table (non-mortgage debts)
  const totalAssets = propAssets + portfolioValue + pensionAssets + capitalSourcesTotal
  const grandTotalDebt = authorativeMortgageDebt + totalLiabilities
  const trueNetWorth = totalAssets - grandTotalDebt

  // ── Service plan ──────────────────────────────────────────────────────────
  const servicePlan   = servicePlanData ?? null
  const sessionsUsed  = servicePlan
    ? (allMeetingsData ?? []).filter(m => new Date(m.date_time) >= new Date(servicePlan.start_date)).length
    : 0
  const isPremium     = (profile as { is_premium?: boolean } | null)?.is_premium ?? false

  // ── Next meeting ──────────────────────────────────────────────────────────
  const nextMeeting = nextMeetingData?.[0] as Meeting | undefined

  const hasCashFlowData =
    props.some(p => p.monthly_rent != null || p.mortgage_monthly_payment != null || p.other_expenses != null) ||
    (txData ?? []).length > 0

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'there'

  return (
    <DashboardClient
      firstName={firstName}
      userId={user.id}
      // KPIs
      totalNetWorth={trueNetWorth}
      totalAssets={totalAssets}
      grandTotalDebt={grandTotalDebt}
      monthlyRentalIncome={totalRent}
      portfolioValue={portfolioValue}
      monthlyDebtService={monthlyDebtService}
      // Allocation
      propAssets={propAssets}
      stockValue={stockValue}
      cryptoValue={cryptoValue}
      pensionAssets={pensionAssets}
      capitalSourcesTotal={capitalSourcesTotal}
      capitalLiquid={capitalLiquid}
      // Loans (mortgage board)
      totalLoanDebt={totalLoanDebt}
      totalLoanMonthly={totalLoanMonthly}
      loanCount={loansRows.length}
      // Old liabilities (backwards compat)
      totalLiabilities={totalLiabilities}
      liabilities={liabilities}
      // Cash flow
      netCashFlow={netCashFlow}
      totalMonthlyIncome={totalMonthlyIncome}
      totalMonthlyExpenses={totalMonthlyExpenses}
      lastMonthNet={lastMonthNet}
      hasCashFlowData={hasCashFlowData}
      propertyCount={propertyCount}
      propEquity={propEquity}
      // Meetings
      nextMeeting={nextMeeting ?? null}
      // Block 4: Service Hub
      servicePlan={servicePlan}
      sessionsUsed={sessionsUsed}
      isPremium={isPremium}
    />
  )
}
