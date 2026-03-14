'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  TrendingUp, Wallet, BarChart3, Landmark,
  Home, Briefcase, CalendarDays,
  GraduationCap, ArrowUpRight, ArrowRight,
  Building2, Coins, LineChart, CreditCard,
  MapPin, Clock, Vault, Banknote, TrendingDown,
  ChevronRight,
} from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'
import StatCard from '@/components/dashboard/StatCard'
import LiabilitiesPanel, { type Liability } from '@/components/dashboard/LiabilitiesPanel'
import type { AllocationItem } from '@/components/dashboard/AllocationChart'
import { type Meeting, TYPE_COLORS } from '@/components/dashboard/MeetingsClient'
import ServiceHubWidget from '@/components/dashboard/ServiceHubWidget'

const AllocationChart = dynamic(
  () => import('@/components/dashboard/AllocationChart'),
  { ssr: false, loading: () => <div className="h-52 animate-pulse rounded-xl bg-muted" /> },
)

// ── Board config ──────────────────────────────────────────────────────────
const BOARD_CONFIG = [
  { icon: Wallet,       href: '/dashboard/cashflow',    color: '#4A6460' },
  { icon: Home,         href: '/dashboard/properties',  color: '#A0806A' },
  { icon: BarChart3,    href: '/dashboard/investments', color: '#D97706' },
  { icon: Landmark,     href: '/dashboard/pension',     color: '#4F46E5' },
  { icon: Vault,        href: '/dashboard/capital',     color: '#059669' },
  { icon: Banknote,     href: '/dashboard/mortgages',   color: '#DC2626' },
  { icon: CalendarDays, href: '/dashboard/meetings',    color: '#7C3AED' },
  { icon: GraduationCap,href: '/dashboard/academy',     color: '#A0806A' },
]

const LIAB_COLORS = [
  '#DC2626', '#EA580C', '#D97706', '#DB2777',
  '#7C3AED', '#0891B2', '#059669', '#4F46E5',
]

const fmt   = (n: number) => '₪' + Math.abs(Math.round(n)).toLocaleString('he-IL', { maximumFractionDigits: 0 })
const fmtSigned = (n: number) => (n >= 0 ? '+' : '') + fmt(n)

interface Props {
  firstName:           string
  userId:              string
  // KPIs
  totalNetWorth:       number
  totalAssets:         number
  grandTotalDebt:      number
  monthlyRentalIncome: number
  portfolioValue:      number
  monthlyDebtService:  number
  // Allocation
  propAssets:          number
  stockValue:          number
  cryptoValue:         number
  pensionAssets:       number
  capitalSourcesTotal: number
  capitalLiquid:       number
  propEquity:          number
  // Loans
  totalLoanDebt:       number
  totalLoanMonthly:    number
  loanCount:           number
  // Old liabilities (backwards compat)
  totalLiabilities:    number
  liabilities:         Liability[]
  // Cash flow
  netCashFlow:          number
  totalMonthlyIncome:   number
  totalMonthlyExpenses: number
  lastMonthNet:         number
  hasCashFlowData:      boolean
  propertyCount:        number
  // Meetings
  nextMeeting:         Meeting | null
  // Block 4: Service Hub
  servicePlan:         { plan_name: string; total_sessions: number; start_date: string } | null
  sessionsUsed:        number
  isPremium:           boolean
}

function daysUntil(iso: string) {
  const today  = new Date(); today.setHours(0,0,0,0)
  const target = new Date(iso); target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export default function DashboardClient({
  firstName, userId,
  totalNetWorth, totalAssets, grandTotalDebt,
  monthlyRentalIncome, portfolioValue, monthlyDebtService,
  propAssets, stockValue, cryptoValue, pensionAssets,
  capitalSourcesTotal, capitalLiquid, propEquity,
  totalLoanDebt, totalLoanMonthly, loanCount,
  totalLiabilities, liabilities,
  netCashFlow, totalMonthlyIncome, totalMonthlyExpenses, lastMonthNet, hasCashFlowData, propertyCount,
  nextMeeting,
  servicePlan, sessionsUsed, isPremium,
}: Props) {
  const { lang, t } = useLang()
  const d  = t.dashboard
  const s  = d.stats
  const al = d.allocation

  const today = new Date().toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Net worth equity pct ─────────────────────────────────────────────────
  const equityPct = totalAssets > 0
    ? Math.max(0, Math.min(100, (totalNetWorth / totalAssets) * 100))
    : 0

  // ── Financial Freedom Gauge (FIRE × 20 rule) ─────────────────────────────
  const FIRE_TARGET = totalMonthlyExpenses > 0 ? totalMonthlyExpenses * 12 * 20 : 0
  const firePct     = FIRE_TARGET > 0
    ? Math.min(100, Math.max(0, (totalNetWorth / FIRE_TARGET) * 100))
    : 0
  const yearsToFIRE = FIRE_TARGET > totalNetWorth && netCashFlow > 0
    ? (FIRE_TARGET - totalNetWorth) / (netCashFlow * 12)
    : null

  // ── Cash flow ────────────────────────────────────────────────────────────
  const cashFlowTrend = hasCashFlowData && lastMonthNet !== 0
    ? ((netCashFlow - lastMonthNet) / Math.abs(lastMonthNet) * 100)
    : null

  // ── Asset allocation chart ─────────────────────────────────────────────
  const assetTotal = propAssets + stockValue + cryptoValue + pensionAssets + capitalSourcesTotal
  const assetData: AllocationItem[] = [
    { name: al.realEstate, value: propAssets,          color: '#4A6460' },
    { name: al.stocks,     value: stockValue,          color: '#A0806A' },
    { name: al.crypto,     value: cryptoValue,         color: '#D97706' },
    { name: al.pension,    value: pensionAssets,        color: '#4F46E5' },
    { name: al.capital,    value: capitalSourcesTotal, color: '#059669' },
  ].filter(d => d.value > 0)

  // ── Liabilities chart ─────────────────────────────────────────────────
  const liabData: AllocationItem[] = liabilities.map((l, i) => ({
    name:  l.lender ? `${l.name} · ${l.lender}` : l.name,
    value: l.total_amount,
    color: LIAB_COLORS[i % LIAB_COLORS.length],
  }))

  const assetsSubtitle = propertyCount === 0 ? s.noProperties : s.acrossProperties(propertyCount)

  // ── 5 Pillar rows ─────────────────────────────────────────────────────
  const pillars = [
    {
      label: lang === 'he' ? 'נדל"ן (שווי)' : 'Real Estate',
      value: fmt(propAssets),
      equity: propAssets > 0 ? fmt(propEquity) : null,
      color: '#4A6460',
      icon: Building2,
      href: '/dashboard/properties',
    },
    {
      label: lang === 'he' ? 'השקעות' : 'Investments',
      value: fmt(portfolioValue),
      equity: null,
      color: '#A0806A',
      icon: BarChart3,
      href: '/dashboard/investments',
    },
    {
      label: lang === 'he' ? 'פנסיה וגמל' : 'Pension',
      value: fmt(pensionAssets),
      equity: null,
      color: '#4F46E5',
      icon: Landmark,
      href: '/dashboard/pension',
    },
    {
      label: lang === 'he' ? 'מקורות הון' : 'Capital',
      value: fmt(capitalSourcesTotal),
      equity: capitalLiquid < capitalSourcesTotal ? fmt(capitalLiquid) : null,
      color: '#059669',
      icon: Vault,
      href: '/dashboard/capital',
    },
    {
      label: lang === 'he' ? 'חוב (הלוואות)' : 'Debt',
      value: `−${fmt(grandTotalDebt)}`,
      equity: null,
      color: '#DC2626',
      icon: TrendingDown,
      href: '/dashboard/mortgages',
    },
  ]

  return (
    <div className="space-y-10 p-6 lg:p-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-subtle">{today}</p>
          <h1 className="text-2xl font-semibold text-foreground">
            {d.greeting}{' '}
            <span className="text-primary">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{d.subtitle}</p>
        </div>
        <div className="hidden md:flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
          <Landmark size={20} className="text-primary" />
        </div>
      </div>

      {/* ── Net Worth Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 p-6 shadow-sm lg:p-8
        bg-gradient-to-br from-[#F5EFE6] via-[#EDE5D6] to-[#E5DBCC]
        dark:from-[#1E2F3D] dark:via-[#172530] dark:to-[#131E2B]">
        {/* subtle gold shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          {/* Left: big NW number */}
          <div>
            <p className="mb-1 text-xs font-semibold tracking-widest text-subtle">{s.netWorth}</p>
            <div className="flex items-end gap-3 flex-wrap">
              <p className="text-4xl font-black tracking-tight text-foreground">
                {fmt(totalNetWorth)}
              </p>
              {cashFlowTrend !== null && (
                <span className={`mb-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  netCashFlow >= lastMonthNet
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {cashFlowTrend >= 0 ? '↑' : '↓'} {Math.abs(cashFlowTrend).toFixed(1)}%
                </span>
              )}
            </div>

            {/* Equity progress bar */}
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{lang === 'he' ? 'הון עצמי' : 'Equity'} {equityPct.toFixed(1)}%</span>
                <span>{lang === 'he' ? 'ממומן' : 'Financed'} {(100 - equityPct).toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
                  style={{ width: `${equityPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: 3 sub-KPIs */}
          <div className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-3">
            <div className="rounded-xl bg-white/70 dark:bg-[#101A26]/40 px-4 py-3 shadow-sm">
              <p className="text-xs text-subtle">{s.totalAssets}</p>
              <p className="mt-0.5 text-base font-bold text-foreground">{fmt(totalAssets)}</p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-[#101A26]/40 px-4 py-3 shadow-sm">
              <p className="text-xs text-subtle">{s.totalDebt}</p>
              <p className="mt-0.5 text-base font-bold text-red-600 dark:text-red-400">{fmt(grandTotalDebt)}</p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-[#101A26]/40 px-4 py-3 shadow-sm">
              <p className="text-xs text-subtle">{s.monthlySurplus}</p>
              <p className={`mt-0.5 text-base font-bold ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {fmtSigned(netCashFlow)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Financial Freedom Gauge ────────────────────────────────────── */}
      {FIRE_TARGET > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{s.fireTitle}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.fireSubtitle}</p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {firePct.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${firePct}%`,
                  background: firePct >= 100
                    ? '#059669'
                    : firePct >= 50
                    ? 'linear-gradient(90deg, var(--color-primary,#C8AA8F)80, var(--color-primary,#A0806A))'
                    : 'linear-gradient(90deg, #9BB0AC80, var(--color-primary,#A0806A))',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-subtle">{lang === 'he' ? 'שווי נטו' : 'Net Worth'}</p>
              <p className="mt-0.5 text-sm font-bold text-primary">{fmt(totalNetWorth)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">{s.fireTarget}</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">{fmt(FIRE_TARGET)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">{lang === 'he' ? 'לפרישה' : 'To Freedom'}</p>
              <p className={`mt-0.5 text-sm font-bold ${firePct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {firePct >= 100
                  ? s.fireReached
                  : yearsToFIRE != null
                  ? s.fireYears(yearsToFIRE)
                  : '—'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 4 KPI Cards ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-subtle">
          {d.financialOverview}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={s.monthlyRental}
            value={monthlyRentalIncome > 0 ? fmt(monthlyRentalIncome) : '—'}
            subtitle={monthlyRentalIncome > 0 ? s.monthlyRentalSub : assetsSubtitle}
            icon={Building2}
            accentColor="#4A6460"
          />
          <StatCard
            title={s.portfolioValue}
            value={portfolioValue > 0 ? fmt(portfolioValue) : '—'}
            subtitle={s.portfolioValueSub}
            icon={LineChart}
            accentColor="#A0806A"
          />
          <StatCard
            title={s.capitalSources}
            value={capitalSourcesTotal > 0 ? fmt(capitalSourcesTotal) : '—'}
            subtitle={capitalLiquid > 0 ? (lang === 'he' ? `נזיל: ${fmt(capitalLiquid)}` : `Liquid: ${fmt(capitalLiquid)}`) : s.capitalSourcesSub}
            icon={Vault}
            accentColor="#059669"
          />
          <StatCard
            title={s.totalDebt}
            value={grandTotalDebt > 0 ? fmt(grandTotalDebt) : '—'}
            subtitle={totalLoanMonthly > 0 ? (lang === 'he' ? `חודשי: ${fmt(totalLoanMonthly)}` : `Monthly: ${fmt(totalLoanMonthly)}`) : s.totalDebtSub}
            icon={CreditCard}
            accentColor="#DC2626"
          />
        </div>
      </section>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Asset allocation — 5 pillars */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{al.title}</h3>
              <p className="text-xs text-muted-foreground">{al.subtitle}</p>
            </div>
            <div className="hidden md:flex flex-col gap-1 text-xs text-muted-foreground">
              {[
                { label: al.realEstate, color: '#4A6460' },
                { label: al.stocks,     color: '#A0806A' },
                { label: al.crypto,     color: '#D97706' },
                { label: al.pension,    color: '#4F46E5' },
                { label: al.capital,    color: '#059669' },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <AllocationChart data={assetData} total={assetTotal} emptyLabel={al.emptyLabel} />
        </div>

        {/* 5-Pillar breakdown table */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            {lang === 'he' ? 'פירוט כל עמודות ההון' : 'All Pillars Breakdown'}
          </h3>
          <p className="mb-5 text-xs text-muted-foreground">
            {lang === 'he' ? 'ערך, הון עצמי ולינק לכל לוח' : 'Value, equity & link to each board'}
          </p>
          <div className="space-y-2">
            {pillars.map(p => (
              <Link
                key={p.href}
                href={p.href}
                className="group flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 transition-all hover:border-primary/30 hover:bg-muted dark:bg-muted/20 dark:hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${p.color}18` }}
                  >
                    <p.icon size={14} style={{ color: p.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    {p.equity && (
                      <p className="text-xs text-subtle">
                        {lang === 'he' ? 'הון עצמי:' : 'Equity:'} {p.equity}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: p.color }}>
                    {p.value}
                  </span>
                  <ChevronRight
                    size={12}
                    className="text-subtle transition-colors group-hover:text-primary"
                  />
                </div>
              </Link>
            ))}
          </div>
          {/* Net Worth total row */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/[0.08] px-4 py-3">
            <span className="text-sm font-semibold text-primary">
              {lang === 'he' ? '= שווי נטו' : '= Net Worth'}
            </span>
            <span className="text-base font-black text-primary">{fmt(totalNetWorth)}</span>
          </div>
        </div>
      </section>

      {/* ── Cash Flow + Mortgage Snapshot ──────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Net cash flow */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[2px]"
               style={{ background: 'linear-gradient(90deg, transparent, #4A6460, transparent)' }} />
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <Wallet size={17} className="text-muted-foreground" />
            </div>
            {cashFlowTrend !== null && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                cashFlowTrend >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {cashFlowTrend >= 0 ? '↑' : '↓'} {Math.abs(cashFlowTrend).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.cashFlow}</p>
          <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {hasCashFlowData ? fmtSigned(netCashFlow) : '—'}
          </p>
          <p className="mt-1 text-xs text-subtle">{hasCashFlowData ? s.cashFlowSub : s.cashFlowEmpty}</p>
          {hasCashFlowData && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{lang === 'he' ? 'הכנסות' : 'Income'}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {totalMonthlyIncome > 0 ? `+${fmt(totalMonthlyIncome)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{lang === 'he' ? 'הוצאות' : 'Expenses'}</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {totalMonthlyExpenses > 0 ? `-${fmt(totalMonthlyExpenses)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-xs">
                <span className="font-semibold text-foreground">{lang === 'he' ? 'נטו' : 'Net'}</span>
                <span className={`font-bold ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmtSigned(netCashFlow)}
                </span>
              </div>
            </div>
          )}
          <Link href="/dashboard/cashflow" className="mt-4 flex items-center gap-1 text-xs text-subtle hover:text-primary transition-colors">
            {lang === 'he' ? 'לוח תזרים' : 'Cash Flow Board'} <ArrowRight size={11} />
          </Link>
        </div>

        {/* Capital snapshot */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[2px]"
               style={{ background: 'linear-gradient(90deg, transparent, #05966944, transparent)' }} />
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <Vault size={17} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.capitalSources}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {capitalSourcesTotal > 0 ? fmt(capitalSourcesTotal) : '—'}
          </p>
          <p className="mt-1 text-xs text-subtle">{s.capitalSourcesSub}</p>
          {capitalSourcesTotal > 0 && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{lang === 'he' ? 'נזיל עכשיו' : 'Liquid now'}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(capitalLiquid)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{lang === 'he' ? 'נעול / עתידי' : 'Locked / future'}</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{fmt(capitalSourcesTotal - capitalLiquid)}</span>
              </div>
            </div>
          )}
          <Link href="/dashboard/capital" className="mt-4 flex items-center gap-1 text-xs text-subtle hover:text-primary transition-colors">
            {lang === 'he' ? 'לוח מקורות הון' : 'Capital Board'} <ArrowRight size={11} />
          </Link>
        </div>

        {/* Mortgage snapshot */}
        <div className="relative overflow-hidden rounded-2xl border border-red-200 dark:border-red-900/30 bg-card p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[2px]"
               style={{ background: 'linear-gradient(90deg, transparent, #DC262644, transparent)' }} />
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
            <Banknote size={17} className="text-red-600 dark:text-red-400" />
          </div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {lang === 'he' ? 'משכנתאות וחוב' : 'Mortgages & Debt'}
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {totalLoanDebt > 0 ? fmt(totalLoanDebt) : grandTotalDebt > 0 ? fmt(grandTotalDebt) : '—'}
          </p>
          <p className="mt-1 text-xs text-subtle">{s.totalDebtSub}</p>
          {(totalLoanMonthly > 0 || monthlyDebtService > 0) && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{lang === 'he' ? 'תשלום חודשי' : 'Monthly payment'}</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {fmt(totalLoanMonthly || monthlyDebtService)}
                </span>
              </div>
              {loanCount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{lang === 'he' ? 'מספר הלוואות' : 'Active loans'}</span>
                  <span className="font-semibold text-foreground">{loanCount}</span>
                </div>
              )}
            </div>
          )}
          <Link href="/dashboard/mortgages" className="mt-4 flex items-center gap-1 text-xs text-subtle hover:text-primary transition-colors">
            {lang === 'he' ? 'לוח משכנתאות' : 'Mortgage Board'} <ArrowRight size={11} />
          </Link>
        </div>
      </section>

      {/* ── Asset class mini-tiles ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: lang === 'he' ? 'נדל"ן'       : 'Real Estate',   value: fmt(propAssets),          color: '#4A6460', icon: Building2  },
          { label: lang === 'he' ? 'מניות ו-ETF' : 'Stocks & ETFs', value: fmt(stockValue),          color: '#A0806A', icon: BarChart3  },
          { label: lang === 'he' ? 'קריפטו'      : 'Crypto',        value: fmt(cryptoValue),         color: '#D97706', icon: Coins      },
          { label: lang === 'he' ? 'פנסיה וגמל'  : 'Pension',       value: fmt(pensionAssets),       color: '#4F46E5', icon: Landmark   },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-base font-bold text-foreground">{value}</p>
          </div>
        ))}
      </section>

      {/* ── Asset allocation chart (full) ───────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">{al.title}</h3>
            <p className="text-xs text-muted-foreground">{al.subtitle}</p>
          </div>
          <AllocationChart data={assetData} total={assetTotal} emptyLabel={al.emptyLabel} />
        </div>

        {/* Liabilities distribution */}
        <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">{d.liabilities.distributionTitle}</h3>
            <p className="text-xs text-muted-foreground">{d.liabilities.distributionSubtitle}</p>
          </div>
          <AllocationChart
            data={liabData}
            total={totalLiabilities}
            emptyLabel={d.liabilities.emptyChart}
            totalLabel={d.liabilities.totalLabel}
            accentColor="#DC2626"
          />
        </div>
      </section>

      {/* ── Liabilities panel (CRUD) ─────────────────────────────────────── */}
      <LiabilitiesPanel initialLiabilities={liabilities} userId={userId} />

      {/* ── Next Meeting ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-subtle">
          {t.meetings.nextMeeting}
        </h2>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          {nextMeeting ? (() => {
            const diff  = daysUntil(nextMeeting.date_time)
            const color = TYPE_COLORS[nextMeeting.meeting_type] ?? '#4A6460'
            return (
              <>
                <div className="absolute inset-y-0 start-0 w-[3px] rounded-full" style={{ background: color }} />
                <div className="ms-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: `${color}15`, color }}
                    >
                      {t.meetings.types[nextMeeting.meeting_type] as string}
                    </span>
                    <p className="mt-2 truncate text-base font-semibold text-foreground">
                      {nextMeeting.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(nextMeeting.date_time).toLocaleDateString(
                          lang === 'he' ? 'he-IL' : 'en-US',
                          { weekday: 'short', month: 'short', day: 'numeric' }
                        )}
                        {' · '}
                        {new Date(nextMeeting.date_time).toLocaleTimeString(
                          lang === 'he' ? 'he-IL' : 'en-US',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </span>
                      {nextMeeting.location && (
                        <span className="flex items-center gap-1 truncate max-w-56">
                          <MapPin size={11} />
                          {nextMeeting.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className="text-sm font-bold" style={{ color }}>
                      {t.meetings.inDays(diff)}
                    </span>
                    <Link
                      href="/dashboard/meetings"
                      className="flex items-center gap-1 text-xs text-subtle transition hover:text-primary"
                    >
                      {t.meetings.viewAll} <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              </>
            )
          })() : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                  <CalendarDays size={17} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{t.meetings.noNextMeeting}</p>
              </div>
              <Link
                href="/dashboard/meetings"
                className="flex items-center gap-1 text-xs text-subtle transition hover:text-primary"
              >
                {t.meetings.viewAll} <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Service Hub + Premium Upsell ────────────────────────────────── */}
      <ServiceHubWidget plan={servicePlan} sessionsUsed={sessionsUsed} isPremium={isPremium} />

      {/* ── Boards Grid ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-subtle">
          {d.yourBoards}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {d.boards.map(({ label, desc }, i) => {
            const { icon: Icon, href, color } = BOARD_CONFIG[i] ?? { icon: Briefcase, href: '#', color: '#4A6460' }
            return (
              <Link
                key={href}
                href={href}
                className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${color}15` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{desc}</p>
                  </div>
                </div>
                <ArrowUpRight
                  size={15}
                  className="mt-0.5 shrink-0 text-subtle transition-colors group-hover:text-primary"
                />
              </Link>
            )
          })}
        </div>
      </section>

    </div>
  )
}
