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
  { ssr: false, loading: () => <div className="h-52 animate-pulse rounded-xl bg-[#2C3B38]" /> },
)

// ── Board config ──────────────────────────────────────────────────────────
const BOARD_CONFIG = [
  { icon: Wallet,       href: '/dashboard/cashflow',    color: '#86968B' },
  { icon: Home,         href: '/dashboard/properties',  color: '#C8AA8F' },
  { icon: BarChart3,    href: '/dashboard/investments', color: '#F59E0B' },
  { icon: Landmark,     href: '/dashboard/pension',     color: '#6366F1' },
  { icon: Vault,        href: '/dashboard/capital',     color: '#10B981' },
  { icon: Banknote,     href: '/dashboard/mortgages',   color: '#EF4444' },
  { icon: CalendarDays, href: '/dashboard/meetings',    color: '#8B5CF6' },
  { icon: GraduationCap,href: '/dashboard/academy',     color: '#C8AA8F' },
]

const LIAB_COLORS = [
  '#EF4444', '#F97316', '#FBBF24', '#EC4899',
  '#8B5CF6', '#06B6D4', '#10B981', '#6366F1',
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
    { name: al.realEstate, value: propAssets,          color: '#86968B' },
    { name: al.stocks,     value: stockValue,          color: '#C8AA8F' },
    { name: al.crypto,     value: cryptoValue,         color: '#F59E0B' },
    { name: al.pension,    value: pensionAssets,        color: '#6366F1' },
    { name: al.capital,    value: capitalSourcesTotal, color: '#10B981' },
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
      color: '#86968B',
      icon: Building2,
      href: '/dashboard/properties',
    },
    {
      label: lang === 'he' ? 'השקעות' : 'Investments',
      value: fmt(portfolioValue),
      equity: null,
      color: '#C8AA8F',
      icon: BarChart3,
      href: '/dashboard/investments',
    },
    {
      label: lang === 'he' ? 'פנסיה וגמל' : 'Pension',
      value: fmt(pensionAssets),
      equity: null,
      color: '#6366F1',
      icon: Landmark,
      href: '/dashboard/pension',
    },
    {
      label: lang === 'he' ? 'מקורות הון' : 'Capital',
      value: fmt(capitalSourcesTotal),
      equity: capitalLiquid < capitalSourcesTotal ? fmt(capitalLiquid) : null,
      color: '#10B981',
      icon: Vault,
      href: '/dashboard/capital',
    },
    {
      label: lang === 'he' ? 'חוב (הלוואות)' : 'Debt',
      value: `−${fmt(grandTotalDebt)}`,
      equity: null,
      color: '#EF4444',
      icon: TrendingDown,
      href: '/dashboard/mortgages',
    },
  ]

  return (
    <div className="space-y-10 p-6 lg:p-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{today}</p>
          <h1 className="text-2xl font-semibold text-[#F0EDE8]">
            {d.greeting}{' '}
            <span className="text-[#C8AA8F]">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-[#86968B]">{d.subtitle}</p>
        </div>
        <div className="hidden md:flex h-11 w-11 items-center justify-center rounded-xl border border-[#C8AA8F]/20 bg-[#C8AA8F]/8">
          <Landmark size={20} className="text-[#C8AA8F]" />
        </div>
      </div>

      {/* ── Net Worth Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-[#C8AA8F]/15 bg-gradient-to-br from-[#172530] via-[#1A2B29] to-[#101A26] p-6 lg:p-8">
        {/* subtle gold shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C8AA8F]/40 to-transparent" />

        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          {/* Left: big NW number */}
          <div>
            <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{s.netWorth}</p>
            <div className="flex items-end gap-3 flex-wrap">
              <p className="text-4xl font-black tracking-tight text-[#F0EDE8]">
                {fmt(totalNetWorth)}
              </p>
              {cashFlowTrend !== null && (
                <span className={`mb-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  netCashFlow >= lastMonthNet
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-red-400/10 text-red-400'
                }`}>
                  {cashFlowTrend >= 0 ? '↑' : '↓'} {Math.abs(cashFlowTrend).toFixed(1)}%
                </span>
              )}
            </div>

            {/* Equity progress bar */}
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-[#86968B]">
                <span>{lang === 'he' ? 'הון עצמי' : 'Equity'} {equityPct.toFixed(1)}%</span>
                <span>{lang === 'he' ? 'ממומן' : 'Financed'} {(100 - equityPct).toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#2C3B38]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C8AA8F]/70 to-[#C8AA8F] transition-all duration-700"
                  style={{ width: `${equityPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: 3 sub-KPIs */}
          <div className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-3">
            <div className="rounded-xl bg-[#101A26]/60 px-4 py-3">
              <p className="text-xs text-[#445147]">{s.totalAssets}</p>
              <p className="mt-0.5 text-base font-bold text-[#F0EDE8]">{fmt(totalAssets)}</p>
            </div>
            <div className="rounded-xl bg-[#101A26]/60 px-4 py-3">
              <p className="text-xs text-[#445147]">{s.totalDebt}</p>
              <p className="mt-0.5 text-base font-bold text-red-400">{fmt(grandTotalDebt)}</p>
            </div>
            <div className="rounded-xl bg-[#101A26]/60 px-4 py-3">
              <p className="text-xs text-[#445147]">{s.monthlySurplus}</p>
              <p className={`mt-0.5 text-base font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtSigned(netCashFlow)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Financial Freedom Gauge ────────────────────────────────────── */}
      {FIRE_TARGET > 0 && (
        <section className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#F0EDE8]">{s.fireTitle}</h2>
              <p className="mt-0.5 text-xs text-[#86968B]">{s.fireSubtitle}</p>
            </div>
            <span className="rounded-full border border-[#C8AA8F]/25 bg-[#C8AA8F]/10 px-3 py-1 text-xs font-bold text-[#C8AA8F]">
              {firePct.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#2C3B38]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${firePct}%`,
                  background: firePct >= 100
                    ? '#10B981'
                    : firePct >= 50
                    ? 'linear-gradient(90deg, #C8AA8F70, #C8AA8F)'
                    : 'linear-gradient(90deg, #86968B70, #C8AA8F)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[#445147]">{lang === 'he' ? 'שווי נטו' : 'Net Worth'}</p>
              <p className="mt-0.5 text-sm font-bold text-[#C8AA8F]">{fmt(totalNetWorth)}</p>
            </div>
            <div>
              <p className="text-xs text-[#445147]">{s.fireTarget}</p>
              <p className="mt-0.5 text-sm font-bold text-[#F0EDE8]">{fmt(FIRE_TARGET)}</p>
            </div>
            <div>
              <p className="text-xs text-[#445147]">{lang === 'he' ? 'לפרישה' : 'To Freedom'}</p>
              <p className={`mt-0.5 text-sm font-bold ${firePct >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
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
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-[#445147]">
          {d.financialOverview}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={s.monthlyRental}
            value={monthlyRentalIncome > 0 ? fmt(monthlyRentalIncome) : '—'}
            subtitle={monthlyRentalIncome > 0 ? s.monthlyRentalSub : assetsSubtitle}
            icon={Building2}
            accentColor="#86968B"
          />
          <StatCard
            title={s.portfolioValue}
            value={portfolioValue > 0 ? fmt(portfolioValue) : '—'}
            subtitle={s.portfolioValueSub}
            icon={LineChart}
            accentColor="#C8AA8F"
          />
          <StatCard
            title={s.capitalSources}
            value={capitalSourcesTotal > 0 ? fmt(capitalSourcesTotal) : '—'}
            subtitle={capitalLiquid > 0 ? (lang === 'he' ? `נזיל: ${fmt(capitalLiquid)}` : `Liquid: ${fmt(capitalLiquid)}`) : s.capitalSourcesSub}
            icon={Vault}
            accentColor="#10B981"
          />
          <StatCard
            title={s.totalDebt}
            value={grandTotalDebt > 0 ? fmt(grandTotalDebt) : '—'}
            subtitle={totalLoanMonthly > 0 ? (lang === 'he' ? `חודשי: ${fmt(totalLoanMonthly)}` : `Monthly: ${fmt(totalLoanMonthly)}`) : s.totalDebtSub}
            icon={CreditCard}
            accentColor="#EF4444"
          />
        </div>
      </section>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Asset allocation — 5 pillars */}
        <div className="rounded-2xl border border-[#2C3B38] bg-[#20302F] p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#F0EDE8]">{al.title}</h3>
              <p className="text-xs text-[#86968B]">{al.subtitle}</p>
            </div>
            <div className="hidden md:flex flex-col gap-1 text-xs text-[#445147]">
              {[
                { label: al.realEstate, color: '#86968B' },
                { label: al.stocks,     color: '#C8AA8F' },
                { label: al.crypto,     color: '#F59E0B' },
                { label: al.pension,    color: '#6366F1' },
                { label: al.capital,    color: '#10B981' },
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
        <div className="rounded-2xl border border-[#2C3B38] bg-[#20302F] p-6">
          <h3 className="mb-1 text-sm font-semibold text-[#F0EDE8]">
            {lang === 'he' ? 'פירוט כל עמודות ההון' : 'All Pillars Breakdown'}
          </h3>
          <p className="mb-5 text-xs text-[#86968B]">
            {lang === 'he' ? 'ערך, הון עצמי ולינק לכל לוח' : 'Value, equity & link to each board'}
          </p>
          <div className="space-y-2">
            {pillars.map(p => (
              <Link
                key={p.href}
                href={p.href}
                className="group flex items-center justify-between rounded-xl border border-[#2C3B38] bg-[#172530]/60 px-4 py-3 transition-all hover:border-[#C8AA8F]/20 hover:bg-[#263A37]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${p.color}18` }}
                  >
                    <p.icon size={14} style={{ color: p.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F0EDE8]">{p.label}</p>
                    {p.equity && (
                      <p className="text-xs text-[#445147]">
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
                    className="text-[#445147] transition-colors group-hover:text-[#C8AA8F]"
                  />
                </div>
              </Link>
            ))}
          </div>
          {/* Net Worth total row */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[#C8AA8F]/15 bg-[#C8AA8F]/5 px-4 py-3">
            <span className="text-sm font-semibold text-[#C8AA8F]">
              {lang === 'he' ? '= שווי נטו' : '= Net Worth'}
            </span>
            <span className="text-base font-black text-[#C8AA8F]">{fmt(totalNetWorth)}</span>
          </div>
        </div>
      </section>

      {/* ── Cash Flow + Mortgage Snapshot ──────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Net cash flow */}
        <div className="relative overflow-hidden rounded-2xl border border-[#2C3B38] bg-[#20302F] p-5">
          <div className="absolute inset-x-0 top-0 h-[2px]"
               style={{ background: 'linear-gradient(90deg, transparent, #86968B, transparent)' }} />
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#86968B]/10">
              <Wallet size={17} className="text-[#86968B]" />
            </div>
            {cashFlowTrend !== null && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                cashFlowTrend >= 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
              }`}>
                {cashFlowTrend >= 0 ? '↑' : '↓'} {Math.abs(cashFlowTrend).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-[#86968B]">{s.cashFlow}</p>
          <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {hasCashFlowData ? fmtSigned(netCashFlow) : '—'}
          </p>
          <p className="mt-1 text-xs text-[#445147]">{hasCashFlowData ? s.cashFlowSub : s.cashFlowEmpty}</p>
          {hasCashFlowData && (
            <div className="mt-4 space-y-2 border-t border-[#2C3B38] pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-[#86968B]">{lang === 'he' ? 'הכנסות' : 'Income'}</span>
                <span className="font-semibold text-emerald-400">
                  {totalMonthlyIncome > 0 ? `+${fmt(totalMonthlyIncome)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#86968B]">{lang === 'he' ? 'הוצאות' : 'Expenses'}</span>
                <span className="font-semibold text-red-400">
                  {totalMonthlyExpenses > 0 ? `-${fmt(totalMonthlyExpenses)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#2C3B38] pt-2 text-xs">
                <span className="font-semibold text-[#F0EDE8]">{lang === 'he' ? 'נטו' : 'Net'}</span>
                <span className={`font-bold ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtSigned(netCashFlow)}
                </span>
              </div>
            </div>
          )}
          <Link href="/dashboard/cashflow" className="mt-4 flex items-center gap-1 text-xs text-[#445147] hover:text-[#C8AA8F] transition-colors">
            {lang === 'he' ? 'לוח תזרים' : 'Cash Flow Board'} <ArrowRight size={11} />
          </Link>
        </div>

        {/* Capital snapshot */}
        <div className="relative overflow-hidden rounded-2xl border border-[#2C3B38] bg-[#20302F] p-5">
          <div className="absolute inset-x-0 top-0 h-[2px]"
               style={{ background: 'linear-gradient(90deg, transparent, #10B98144, transparent)' }} />
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <Vault size={17} className="text-emerald-400" />
          </div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-[#86968B]">{s.capitalSources}</p>
          <p className="text-2xl font-bold text-emerald-400">
            {capitalSourcesTotal > 0 ? fmt(capitalSourcesTotal) : '—'}
          </p>
          <p className="mt-1 text-xs text-[#445147]">{s.capitalSourcesSub}</p>
          {capitalSourcesTotal > 0 && (
            <div className="mt-4 space-y-2 border-t border-[#2C3B38] pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-[#86968B]">{lang === 'he' ? 'נזיל עכשיו' : 'Liquid now'}</span>
                <span className="font-semibold text-emerald-400">{fmt(capitalLiquid)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#86968B]">{lang === 'he' ? 'נעול / עתידי' : 'Locked / future'}</span>
                <span className="font-semibold text-amber-400">{fmt(capitalSourcesTotal - capitalLiquid)}</span>
              </div>
            </div>
          )}
          <Link href="/dashboard/capital" className="mt-4 flex items-center gap-1 text-xs text-[#445147] hover:text-[#C8AA8F] transition-colors">
            {lang === 'he' ? 'לוח מקורות הון' : 'Capital Board'} <ArrowRight size={11} />
          </Link>
        </div>

        {/* Mortgage snapshot */}
        <div className="relative overflow-hidden rounded-2xl border border-red-900/30 bg-[#20302F] p-5">
          <div className="absolute inset-x-0 top-0 h-[2px]"
               style={{ background: 'linear-gradient(90deg, transparent, #EF444444, transparent)' }} />
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
            <Banknote size={17} className="text-red-400" />
          </div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-[#86968B]">
            {lang === 'he' ? 'משכנתאות וחוב' : 'Mortgages & Debt'}
          </p>
          <p className="text-2xl font-bold text-red-400">
            {totalLoanDebt > 0 ? fmt(totalLoanDebt) : grandTotalDebt > 0 ? fmt(grandTotalDebt) : '—'}
          </p>
          <p className="mt-1 text-xs text-[#445147]">{s.totalDebtSub}</p>
          {(totalLoanMonthly > 0 || monthlyDebtService > 0) && (
            <div className="mt-4 space-y-2 border-t border-[#2C3B38] pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-[#86968B]">{lang === 'he' ? 'תשלום חודשי' : 'Monthly payment'}</span>
                <span className="font-semibold text-red-400">
                  {fmt(totalLoanMonthly || monthlyDebtService)}
                </span>
              </div>
              {loanCount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#86968B]">{lang === 'he' ? 'מספר הלוואות' : 'Active loans'}</span>
                  <span className="font-semibold text-[#F0EDE8]">{loanCount}</span>
                </div>
              )}
            </div>
          )}
          <Link href="/dashboard/mortgages" className="mt-4 flex items-center gap-1 text-xs text-[#445147] hover:text-[#C8AA8F] transition-colors">
            {lang === 'he' ? 'לוח משכנתאות' : 'Mortgage Board'} <ArrowRight size={11} />
          </Link>
        </div>
      </section>

      {/* ── Asset class mini-tiles ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: lang === 'he' ? 'נדל"ן'       : 'Real Estate',   value: fmt(propAssets),          color: '#86968B', icon: Building2  },
          { label: lang === 'he' ? 'מניות ו-ETF' : 'Stocks & ETFs', value: fmt(stockValue),          color: '#C8AA8F', icon: BarChart3  },
          { label: lang === 'he' ? 'קריפטו'      : 'Crypto',        value: fmt(cryptoValue),         color: '#F59E0B', icon: Coins      },
          { label: lang === 'he' ? 'פנסיה וגמל'  : 'Pension',       value: fmt(pensionAssets),       color: '#6366F1', icon: Landmark   },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[#2C3B38] bg-[#20302F] p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-xs text-[#86968B]">{label}</span>
            </div>
            <p className="text-base font-bold text-[#F0EDE8]">{value}</p>
          </div>
        ))}
      </section>

      {/* ── Asset allocation chart (full) ───────────────────────────────── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2C3B38] bg-[#20302F] p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[#F0EDE8]">{al.title}</h3>
            <p className="text-xs text-[#86968B]">{al.subtitle}</p>
          </div>
          <AllocationChart data={assetData} total={assetTotal} emptyLabel={al.emptyLabel} />
        </div>

        {/* Liabilities distribution */}
        <div className="rounded-2xl border border-red-900/30 bg-[#20302F] p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[#F0EDE8]">{d.liabilities.distributionTitle}</h3>
            <p className="text-xs text-[#86968B]">{d.liabilities.distributionSubtitle}</p>
          </div>
          <AllocationChart
            data={liabData}
            total={totalLiabilities}
            emptyLabel={d.liabilities.emptyChart}
            totalLabel={d.liabilities.totalLabel}
            accentColor="#EF4444"
          />
        </div>
      </section>

      {/* ── Liabilities panel (CRUD) ─────────────────────────────────────── */}
      <LiabilitiesPanel initialLiabilities={liabilities} userId={userId} />

      {/* ── Next Meeting ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-[#445147]">
          {t.meetings.nextMeeting}
        </h2>
        <div className="relative overflow-hidden rounded-2xl border border-[#2C3B38] bg-[#20302F] p-5">
          {nextMeeting ? (() => {
            const diff  = daysUntil(nextMeeting.date_time)
            const color = TYPE_COLORS[nextMeeting.meeting_type] ?? '#86968B'
            return (
              <>
                <div className="absolute inset-y-0 start-0 w-[3px] rounded-full" style={{ background: color }} />
                <div className="ms-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: `${color}20`, color }}
                    >
                      {t.meetings.types[nextMeeting.meeting_type] as string}
                    </span>
                    <p className="mt-2 truncate text-base font-semibold text-[#F0EDE8]">
                      {nextMeeting.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#86968B]">
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
                      className="flex items-center gap-1 text-xs text-[#445147] transition hover:text-[#C8AA8F]"
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2C3B38]">
                  <CalendarDays size={17} className="text-[#445147]" />
                </div>
                <p className="text-sm text-[#445147]">{t.meetings.noNextMeeting}</p>
              </div>
              <Link
                href="/dashboard/meetings"
                className="flex items-center gap-1 text-xs text-[#445147] transition hover:text-[#C8AA8F]"
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
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-[#445147]">
          {d.yourBoards}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {d.boards.map(({ label, desc }, i) => {
            const { icon: Icon, href, color } = BOARD_CONFIG[i] ?? { icon: Briefcase, href: '#', color: '#86968B' }
            return (
              <Link
                key={href}
                href={href}
                className="group flex items-start justify-between gap-3 rounded-xl border border-[#2C3B38] bg-[#20302F] p-4 transition-all duration-200 hover:border-[#C8AA8F]/30 hover:bg-[#263A37]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${color}15` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F0EDE8] leading-snug">{label}</p>
                    <p className="mt-0.5 text-xs text-[#86968B] leading-snug">{desc}</p>
                  </div>
                </div>
                <ArrowUpRight
                  size={15}
                  className="mt-0.5 shrink-0 text-[#445147] transition-colors group-hover:text-[#C8AA8F]"
                />
              </Link>
            )
          })}
        </div>
      </section>

    </div>
  )
}
