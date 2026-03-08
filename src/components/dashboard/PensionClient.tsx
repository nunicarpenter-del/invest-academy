'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Landmark, TrendingUp, Wallet, Hash,
  Building2, DollarSign, ChevronDown, FileText, Calendar,
  Lock, Unlock, ShieldCheck, ShieldOff, Coins, AlertTriangle,
  CheckCircle2, Zap, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import dynamic from 'next/dynamic'
import AnalystAlert from './AnalystAlert'

const AllocationChart = dynamic(() => import('./AllocationChart'), { ssr: false })
const LiquidityChart  = dynamic(() => import('./LiquidityChart'),  { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────
const ACCOUNT_TYPES = ['pension', 'study_fund', 'savings', 'provident'] as const
type AccountType = typeof ACCOUNT_TYPES[number]

type SourceType = 'study_fund' | 'provident_fund' | 'savings' | 'property_equity' | 'pension'
const SOURCE_TYPES: SourceType[] = ['study_fund', 'provident_fund', 'savings', 'property_equity', 'pension']

interface PensionAccount {
  id:              string
  name:            string
  account_type:    string
  provider:        string | null
  balance:         number
  monthly_deposit: number
  yield_percent:   number | null
  start_date:      string | null
  maturity_date:   string | null
  notes:           string | null
  created_at:      string
}

export interface CapitalSource {
  id:                       string
  name:                     string
  source_type:              SourceType
  current_balance:          number
  estimated_yield:          number
  liquidity_date:           string | null
  is_collateral:            boolean
  allocated_to_property_id: string | null
  allocated_amount:         number | null
  notes:                    string | null
  created_at:               string
}

export interface PropertyRef {
  id:                        string
  name:                      string
  property_type:             string
  completion_funding_source: string | null
  completion_amount:         number | null
  delivery_equity:           number | null
  target_exit_date:          string | null
}

interface Props {
  accounts:   PensionAccount[]
  sources:    CapitalSource[]
  properties: PropertyRef[]
  netCashFlow: number
}

// ── Helpers ────────────────────────────────────────────────────────────────
const n = (v: number | null | undefined) => v ?? 0

const fmtILS = (val: number) =>
  '₪' + Math.round(Math.abs(val)).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const fmtPct = (v: number) => `${v.toFixed(1)}%`

const fmtDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function futureValue(pv: number, annualYield: number, months: number): number {
  if (months <= 0) return pv
  const r = annualYield / 100 / 12
  return pv * Math.pow(1 + r, months)
}

function monthsDiff(from: Date, toDateStr: string | null): number {
  if (!toDateStr) return 0
  const to = new Date(toDateStr)
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

// ── Color maps ────────────────────────────────────────────────────────────
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  pension:    'bg-[#C8AA8F]/10 text-[#C8AA8F]  border-[#C8AA8F]/25',
  study_fund: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  savings:    'bg-blue-400/10  text-blue-400   border-blue-400/20',
  provident:  'bg-purple-400/10 text-purple-400 border-purple-400/20',
}

const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  study_fund:      'bg-blue-500/15 text-blue-400 border-blue-500/20',
  provident_fund:  'bg-purple-500/15 text-purple-400 border-purple-500/20',
  savings:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  property_equity: 'bg-[#C8AA8F]/15 text-[#C8AA8F] border-[#C8AA8F]/20',
  pension:         'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
}

// ── Empty forms ────────────────────────────────────────────────────────────
const makeEmptyAccount = () => ({
  name:            '',
  account_type:    'pension' as AccountType,
  provider:        '',
  balance:         '',
  monthly_deposit: '',
  yield_percent:   '',
  start_date:      '',
  maturity_date:   '',
  notes:           '',
})

const EMPTY_SOURCE = {
  name:                      '',
  source_type:               'study_fund' as SourceType,
  current_balance:           '',
  estimated_yield:           '5',
  liquidity_date:            '',
  is_collateral:             false,
  allocated_to_property_id:  '',
  allocated_amount:          '',
  notes:                     '',
}
type SourceFormState = typeof EMPTY_SOURCE

// ── Shared field styles ────────────────────────────────────────────────────
const baseCls  = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-4 pl-10 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-colors focus:border-[#C8AA8F]/50 focus:ring-1 focus:ring-[#C8AA8F]/20'
const selCls   = 'w-full appearance-none rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-8 pl-10 text-sm text-[#F0EDE8] outline-none cursor-pointer transition-colors focus:border-[#C8AA8F]/50'
const plainCls = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 px-4 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-colors focus:border-[#C8AA8F]/50 focus:ring-1 focus:ring-[#C8AA8F]/20'

const wrap = (icon: React.ReactNode, child: React.ReactNode) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">{icon}</span>
    {child}
  </div>
)

const lbl = (text: string) => (
  <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{text}</label>
)

// ── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({
  title, count, onAdd, addLabel,
}: { title: string; count: number; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#2C3B38] pb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-[#F0EDE8]">{title}</h2>
        {count > 0 && (
          <span className="rounded-full border border-[#2C3B38] bg-[#172530] px-2 py-0.5 text-xs text-[#86968B]">
            {count}
          </span>
        )}
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 px-3 py-2 text-xs font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50"
      >
        <Plus size={13} />{addLabel}
      </button>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function PensionClient({ accounts: initialAccounts, sources: initialSources, properties, netCashFlow }: Props) {
  const router  = useRouter()
  const { t }   = useLang()
  const p       = t.pension
  const cap     = t.capital

  const [isPending, startTransition] = useTransition()

  // ── Pension account modal ──────────────────────────────────────────────
  const [accountModal, setAccountModal] = useState<'add' | 'edit' | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountForm, setAccountForm]   = useState(makeEmptyAccount())

  const openAddAccount = () => {
    setAccountError(null); setAccountForm(makeEmptyAccount()); setEditingAccountId(null); setAccountModal('add')
  }
  const openEditAccount = (a: PensionAccount) => {
    setAccountError(null)
    setAccountForm({
      name:            a.name,
      account_type:    a.account_type as AccountType,
      provider:        a.provider ?? '',
      balance:         String(a.balance),
      monthly_deposit: String(a.monthly_deposit),
      yield_percent:   a.yield_percent != null ? String(a.yield_percent) : '',
      start_date:      a.start_date ?? '',
      maturity_date:   a.maturity_date ?? '',
      notes:           a.notes ?? '',
    })
    setEditingAccountId(a.id); setAccountModal('edit')
  }
  const closeAccountModal = () => { setAccountModal(null); setEditingAccountId(null); setAccountError(null) }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault(); setAccountError(null)
    const supabase = createClient()
    const payload = {
      name:            accountForm.name.trim(),
      account_type:    accountForm.account_type,
      provider:        accountForm.provider.trim() || null,
      balance:         parseFloat(accountForm.balance)         || 0,
      monthly_deposit: parseFloat(accountForm.monthly_deposit) || 0,
      yield_percent:   accountForm.yield_percent ? parseFloat(accountForm.yield_percent) : null,
      start_date:      accountForm.start_date || null,
      maturity_date:   accountForm.maturity_date || null,
      notes:           accountForm.notes.trim() || null,
      updated_at:      new Date().toISOString(),
    }
    if (accountModal === 'add') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAccountError(p.form.notAuth); return }
      const { error: err } = await supabase.from('pension_accounts').insert({ ...payload, user_id: user.id })
      if (err) { setAccountError(err.message); return }
    } else if (accountModal === 'edit' && editingAccountId) {
      const { error: err } = await supabase.from('pension_accounts').update(payload).eq('id', editingAccountId)
      if (err) { setAccountError(err.message); return }
    }
    closeAccountModal(); startTransition(() => router.refresh())
  }

  const handleDeleteAccount = async () => {
    if (!editingAccountId) return
    const supabase = createClient()
    const { error: err } = await supabase.from('pension_accounts').delete().eq('id', editingAccountId)
    if (err) { setAccountError(err.message); return }
    closeAccountModal(); startTransition(() => router.refresh())
  }

  // ── Capital source modal ───────────────────────────────────────────────
  const [sourceOpen, setSourceOpen] = useState(false)
  const [editSrc, setEditSrc]       = useState<CapitalSource | null>(null)
  const [sourceForm, setSourceForm] = useState<SourceFormState>(EMPTY_SOURCE)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [doubleAllocPropName, setDoubleAllocPropName] = useState<string | null>(null)

  const today = new Date()

  const openAddSource = () => {
    setSourceForm(EMPTY_SOURCE); setEditSrc(null); setSourceError(null); setDoubleAllocPropName(null); setSourceOpen(true)
  }
  const openEditSource = (src: CapitalSource) => {
    setSourceForm({
      name:                     src.name,
      source_type:              src.source_type,
      current_balance:          src.current_balance.toString(),
      estimated_yield:          src.estimated_yield.toString(),
      liquidity_date:           src.liquidity_date ?? '',
      is_collateral:            src.is_collateral,
      allocated_to_property_id: src.allocated_to_property_id ?? '',
      allocated_amount:         src.allocated_amount?.toString() ?? '',
      notes:                    src.notes ?? '',
    })
    setEditSrc(src); setSourceError(null); setDoubleAllocPropName(null); setSourceOpen(true)
  }

  const checkDoubleAlloc = (newPropId: string, sourceId: string | null) => {
    if (!newPropId) { setDoubleAllocPropName(null); return }
    const conflict = initialSources.find(
      (s) => s.allocated_to_property_id === newPropId && s.id !== sourceId
    )
    if (conflict) {
      const propName = properties.find((p) => p.id === newPropId)?.name ?? newPropId
      setDoubleAllocPropName(propName)
    } else {
      setDoubleAllocPropName(null)
    }
  }

  const handleSubmitSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (doubleAllocPropName) { setSourceError(cap.analyst.doubleAlloc(doubleAllocPropName)); return }
    setSourceError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSourceError(cap.form.notAuth); return }

    const payload = {
      user_id:                  user.id,
      name:                     sourceForm.name.trim(),
      source_type:              sourceForm.source_type,
      current_balance:          parseFloat(sourceForm.current_balance) || 0,
      estimated_yield:          parseFloat(sourceForm.estimated_yield) || 5,
      liquidity_date:           sourceForm.liquidity_date || null,
      is_collateral:            sourceForm.is_collateral,
      allocated_to_property_id: sourceForm.allocated_to_property_id || null,
      allocated_amount:         sourceForm.allocated_amount ? parseFloat(sourceForm.allocated_amount) : null,
      notes:                    sourceForm.notes.trim() || null,
    }

    const { error: dbErr } = editSrc
      ? await supabase.from('capital_sources').update(payload).eq('id', editSrc.id)
      : await supabase.from('capital_sources').insert(payload)

    if (dbErr) { setSourceError(dbErr.message); return }
    setSourceOpen(false); startTransition(() => router.refresh())
  }

  const handleDeleteSource = async () => {
    if (!editSrc) return
    const supabase = createClient()
    await supabase.from('capital_sources').delete().eq('id', editSrc.id)
    setSourceOpen(false); startTransition(() => router.refresh())
  }

  // ── Combined summary totals ───────────────────────────────────────────
  const totalBalance = initialAccounts.reduce((s, a) => s + n(a.balance), 0)
    + initialSources.reduce((s, src) => s + src.current_balance, 0)
  const totalMonthlyDeposit = initialAccounts.reduce((s, a) => s + n(a.monthly_deposit), 0)

  const allYields = [
    ...initialAccounts.filter((a) => a.yield_percent != null).map((a) => ({
      balance: a.balance, yield: n(a.yield_percent),
    })),
    ...initialSources.map((s) => ({ balance: s.current_balance, yield: s.estimated_yield })),
  ]
  const totalYieldWeight = allYields.reduce((s, y) => s + y.balance, 0)
  const avgYield = totalYieldWeight > 0
    ? allYields.reduce((s, y) => s + y.yield * y.balance, 0) / totalYieldWeight
    : null

  // Capital source derived totals
  const availableNow = initialSources
    .filter((s) => !s.allocated_to_property_id && (!s.liquidity_date || new Date(s.liquidity_date) <= today))
    .reduce((sum, s) => sum + s.current_balance, 0)

  const chartSources = initialSources.map((s) => ({
    id:                       s.id,
    name:                     s.name,
    current_balance:          s.current_balance,
    estimated_yield:          s.estimated_yield,
    liquidity_date:           s.liquidity_date,
    allocated_to_property_id: s.allocated_to_property_id,
    allocated_amount:         s.allocated_amount,
  }))

  const isEmptyBoard = initialAccounts.length === 0 && initialSources.length === 0

  // ── Source field helper ────────────────────────────────────────────────
  const sfld = (
    key: keyof SourceFormState,
    label: string,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={sourceForm[key] as string}
        onChange={(e) => setSourceForm((f) => ({ ...f, [key]: e.target.value }))}
        className={plainCls}
      />
    </div>
  )

  // ── Pension AllocationChart data ──────────────────────────────────────
  const ACCOUNT_CHART_COLORS: Record<string, string> = {
    pension:    '#C8AA8F',
    study_fund: '#10B981',
    savings:    '#3B82F6',
    provident:  '#A78BFA',
  }

  const accountChartData = Object.entries(
    initialAccounts.reduce<Record<string, { value: number; type: string }>>((acc, a) => {
      const key = p.types[a.account_type] ?? a.account_type
      if (!acc[key]) acc[key] = { value: 0, type: a.account_type }
      acc[key].value += n(a.balance)
      return acc
    }, {})
  ).map(([name, { value, type }]) => ({
    name,
    value: Math.round(value),
    color: ACCOUNT_CHART_COLORS[type] ?? '#86968B',
  })).filter((d) => d.value > 0)

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 p-6 lg:p-10">

      {/* ── Page Header ── */}
      <div>
        <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{p.section}</p>
        <h1 className="text-2xl font-semibold text-[#F0EDE8]">{p.title}</h1>
        <p className="mt-1 text-sm text-[#86968B]">{p.subtitle}</p>
      </div>

      {/* ── Empty board banner ── */}
      {isEmptyBoard && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#C8AA8F]/20 bg-[#C8AA8F]/8 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C8AA8F]/30 bg-[#C8AA8F]/15">
            <span className="text-xs font-bold text-[#C8AA8F]">AI</span>
          </div>
          <p className="text-sm leading-relaxed text-[#C8AA8F]">{p.emptyBoardBanner}</p>
        </div>
      )}

      {/* ── Combined Summary Bar ── */}
      {!isEmptyBoard && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: p.summary.totalBalance, value: fmtILS(totalBalance), color: 'text-[#C8AA8F]', icon: Landmark },
            { label: p.summary.totalMonthly, value: fmtILS(totalMonthlyDeposit) + ' / חודש', color: 'text-[#F0EDE8]', icon: Wallet },
            {
              label: p.summary.avgYield,
              value: avgYield != null ? avgYield.toFixed(1) + '%' : '—',
              color: avgYield != null && avgYield >= 0 ? 'text-emerald-400' : 'text-[#86968B]',
              icon:  TrendingUp,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-[#2C3B38] bg-[#172530] px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C8AA8F]/15 bg-[#C8AA8F]/8">
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest text-[#445147]">{label}</p>
                <p className={`mt-0.5 text-xl font-bold tracking-tight ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SECTION A: Pension & Funds ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5 space-y-5">
        <SectionHeader
          title={p.pensionSection}
          count={initialAccounts.length}
          onAdd={openAddAccount}
          addLabel={p.addButton}
        />

        {/* Allocation chart + yield bars (shown only if there are accounts) */}
        {initialAccounts.length > 0 && (() => {
          const total = accountChartData.reduce((s, d) => s + d.value, 0)
          return (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AllocationChart
                data={accountChartData}
                total={total}
                totalLabel={p.summary.totalBalance}
                emptyLabel={p.emptyHint}
                accentColor="#C8AA8F"
              />
              <div className="rounded-2xl border border-[#2C3B38] bg-[#101A26] p-5">
                <p className="mb-4 text-xs font-semibold tracking-widest text-[#445147]">{p.table.yield}</p>
                <div className="space-y-3">
                  {initialAccounts
                    .filter((a) => a.yield_percent != null)
                    .sort((a, b) => n(b.yield_percent) - n(a.yield_percent))
                    .map((a) => {
                      const yld = n(a.yield_percent)
                      const max = Math.max(...initialAccounts.map((x) => Math.abs(n(x.yield_percent))), 1)
                      const pct = (Math.abs(yld) / max) * 100
                      return (
                        <div key={a.id}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="truncate text-[#86968B]">{a.name}</span>
                            <span className={`font-semibold ${yld >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {yld >= 0 ? '+' : ''}{yld.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#2C3B38]">
                            <div style={{ width: `${pct}%` }} className={`h-full rounded-full ${yld >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Pension accounts table or empty state */}
        {initialAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B38] bg-[#101A26]/50 py-12 text-center">
            <Landmark size={32} className="mb-3 text-[#445147]" />
            <p className="text-sm font-medium text-[#86968B]">{p.emptyTitle}</p>
            <p className="mt-1 text-xs text-[#445147]">{p.emptyHint}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#2C3B38]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#2C3B38] bg-[#101A26]">
                    {[p.table.name, p.table.type, p.table.provider, p.table.balance, p.table.monthly, p.table.yield, p.table.startDate, ''].map((h, i) => (
                      <th key={i} className="px-5 py-3.5 text-right text-xs font-semibold tracking-widest text-[#445147]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C3B38] bg-[#101A26]">
                  {initialAccounts.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-[#172530]/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#C8AA8F]/15 bg-[#C8AA8F]/8">
                            <Landmark size={14} className="text-[#C8AA8F]" />
                          </div>
                          <p dir="auto" className="font-medium text-[#F0EDE8]">{a.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ACCOUNT_TYPE_COLORS[a.account_type] ?? ACCOUNT_TYPE_COLORS.pension}`}>
                          {p.types[a.account_type] ?? a.account_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#86968B]">{a.provider ?? '—'}</td>
                      <td className="px-5 py-4 font-semibold text-[#C8AA8F]">{fmtILS(a.balance)}</td>
                      <td className="px-5 py-4 text-[#F0EDE8]">{fmtILS(a.monthly_deposit)}</td>
                      <td className="px-5 py-4">
                        {a.yield_percent != null ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${a.yield_percent >= 0 ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-red-400 bg-red-400/10 border border-red-400/20'}`}>
                            {a.yield_percent >= 0 ? '+' : ''}{a.yield_percent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[#445147]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#86968B]">{fmtDate(a.start_date)}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEditAccount(a)}
                          className="flex items-center gap-1.5 rounded-xl border border-[#C8AA8F]/25 bg-[#C8AA8F]/8 px-3 py-1.5 text-xs font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/18 hover:border-[#C8AA8F]/45"
                        >
                          {p.form.editButton}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── SECTION B: Capital Sources ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5 space-y-5">
        <SectionHeader
          title={p.capitalSection}
          count={initialSources.length}
          onAdd={openAddSource}
          addLabel={cap.addButton}
        />

        {/* Liquidity Timeline Chart */}
        {initialSources.length > 0 && (
          <div className="rounded-2xl border border-[#2C3B38] bg-[#101A26] p-4">
            <LiquidityChart sources={chartSources} />
          </div>
        )}

        {/* Capital sources grid or empty state */}
        {initialSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B38] bg-[#101A26]/50 py-12 text-center">
            <Coins size={32} className="mb-3 text-[#445147]" />
            <p className="text-sm font-medium text-[#86968B]">{cap.emptyTitle}</p>
            <p className="mt-1 text-xs text-[#445147]">{cap.emptyHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialSources.map((src) => {
              const allocProp    = src.allocated_to_property_id
                ? properties.find((p) => p.id === src.allocated_to_property_id)
                : null
              const deliveryDate = allocProp?.target_exit_date ?? null
              const fvMonths     = Math.max(0, monthsDiff(today, deliveryDate))
              const fv           = futureValue(src.current_balance, src.estimated_yield, fvMonths)
              const yieldGain    = fv - src.current_balance
              const isLiquid     = !src.liquidity_date || new Date(src.liquidity_date) <= today

              return (
                <div key={src.id} className="rounded-2xl border border-[#2C3B38] bg-[#101A26] p-5 transition-colors hover:border-[#C8AA8F]/20">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p dir="auto" className="truncate font-semibold text-[#F0EDE8]">{src.name}</p>
                      <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SOURCE_TYPE_COLORS[src.source_type]}`}>
                        {cap.sourceTypes[src.source_type]}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {src.is_collateral && (
                        <div title={cap.card.collateral} className="flex h-6 w-6 items-center justify-center rounded-md bg-[#C8AA8F]/10">
                          <ShieldCheck size={12} className="text-[#C8AA8F]" />
                        </div>
                      )}
                      <button onClick={() => openEditSource(src)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[#2C3B38] pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{cap.card.balance}</span>
                      <span className="font-bold text-[#F0EDE8]">{fmtILS(src.current_balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{cap.card.yield}</span>
                      <span className="font-medium text-[#C8AA8F]">{fmtPct(src.estimated_yield)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#86968B]">{cap.card.liquidityDate}</span>
                      <span className={`font-medium ${isLiquid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {src.liquidity_date ? fmtDate(src.liquidity_date) : '—'}
                      </span>
                    </div>
                    {deliveryDate && fvMonths > 0 && (
                      <div className="flex justify-between rounded-lg border border-blue-500/15 bg-blue-500/8 px-2.5 py-1.5 text-xs">
                        <span className="text-[#86968B]">{cap.card.futureValue}</span>
                        <div className="text-right">
                          <span className="font-bold text-blue-400">{fmtILS(fv)}</span>
                          {yieldGain > 0 && (
                            <span className="ml-1.5 text-[10px] text-emerald-400">+{fmtILS(yieldGain)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${allocProp ? 'border-amber-500/20 bg-amber-500/8' : 'border-[#2C3B38] bg-[#172530]/30'}`}>
                    {allocProp ? <Lock size={11} className="shrink-0 text-amber-400" /> : <Unlock size={11} className="shrink-0 text-[#445147]" />}
                    <p className={`truncate text-xs ${allocProp ? 'text-amber-400 font-semibold' : 'text-[#445147]'}`}>
                      {allocProp ? `${cap.card.allocatedTo}${allocProp.name}` : cap.card.notAllocated}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Pension Account Modal ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAccountModal} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#2C3B38] bg-[#172530] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F0EDE8]">
                {accountModal === 'add' ? p.form.title : p.form.editTitle}
              </h2>
              <button onClick={closeAccountModal} className="text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                {lbl(p.form.name)}
                {wrap(
                  <Landmark size={14} />,
                  <input type="text" required placeholder={p.form.namePlaceholder} value={accountForm.name}
                    onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))} className={baseCls} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {lbl(p.form.type)}
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={14} /></span>
                    <select value={accountForm.account_type} onChange={(e) => setAccountForm((f) => ({ ...f, account_type: e.target.value as AccountType }))} className={selCls}>
                      {ACCOUNT_TYPES.map((v) => (
                        <option key={v} value={v} className="bg-[#172530]">{p.types[v] ?? v}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#445147]"><ChevronDown size={13} /></span>
                  </div>
                </div>
                <div>
                  {lbl(p.form.provider)}
                  {wrap(<Building2 size={14} />, <input type="text" placeholder={p.form.providerPlaceholder} value={accountForm.provider} onChange={(e) => setAccountForm((f) => ({ ...f, provider: e.target.value }))} className={baseCls} />)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {lbl(p.form.balance)}
                  {wrap(<DollarSign size={14} />, <input type="number" min="0" step="any" placeholder="0" required value={accountForm.balance} onChange={(e) => setAccountForm((f) => ({ ...f, balance: e.target.value }))} className={baseCls} />)}
                </div>
                <div>
                  {lbl(p.form.monthly)}
                  {wrap(<Wallet size={14} />, <input type="number" min="0" step="any" placeholder="0" value={accountForm.monthly_deposit} onChange={(e) => setAccountForm((f) => ({ ...f, monthly_deposit: e.target.value }))} className={baseCls} />)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {lbl(p.form.yield)}
                  {wrap(<TrendingUp size={14} />, <input type="number" step="0.01" placeholder="0.00" value={accountForm.yield_percent} onChange={(e) => setAccountForm((f) => ({ ...f, yield_percent: e.target.value }))} className={baseCls} />)}
                </div>
                <div>
                  {lbl(p.form.startDate)}
                  {wrap(<Calendar size={14} />, <input type="date" value={accountForm.start_date} onChange={(e) => setAccountForm((f) => ({ ...f, start_date: e.target.value }))} className={baseCls} />)}
                </div>
              </div>

              <div>
                {lbl(p.form.maturityDate)}
                {wrap(<Calendar size={14} />, <input type="date" value={accountForm.maturity_date} onChange={(e) => setAccountForm((f) => ({ ...f, maturity_date: e.target.value }))} className={baseCls} />)}
              </div>

              <div>
                {lbl(p.form.notes)}
                {wrap(<FileText size={14} />, <input type="text" value={accountForm.notes} onChange={(e) => setAccountForm((f) => ({ ...f, notes: e.target.value }))} className={baseCls} />)}
              </div>

              {accountError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{accountError}</p>}

              <div className="flex gap-3 pt-1">
                {accountModal === 'edit' && (
                  <button type="button" onClick={handleDeleteAccount} disabled={isPending}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50">
                    {p.form.delete}
                  </button>
                )}
                <button type="button" onClick={closeAccountModal}
                  className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm font-medium text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                  {p.form.cancel}
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50 disabled:opacity-50">
                  {isPending ? p.form.saving : p.form.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── Capital Source Modal ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {sourceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSourceOpen(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#2C3B38] bg-[#172530] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2C3B38] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#F0EDE8]">
                {editSrc ? cap.form.editTitle : cap.form.addTitle}
              </h2>
              <button onClick={() => setSourceOpen(false)} className="text-[#86968B] hover:text-[#F0EDE8]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitSource} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {sfld('name', cap.form.name, 'text', cap.form.namePlaceholder)}

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{cap.form.sourceType}</label>
                <select value={sourceForm.source_type} onChange={(e) => setSourceForm((f) => ({ ...f, source_type: e.target.value as SourceType }))} className={plainCls}>
                  {SOURCE_TYPES.map((st) => (
                    <option key={st} value={st} className="bg-[#172530]">{cap.sourceTypes[st]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {sfld('current_balance', cap.form.currentBalance, 'number', '0')}
                {sfld('estimated_yield', cap.form.estimatedYield, 'number', '5')}
              </div>

              {sfld('liquidity_date', cap.form.liquidityDate, 'date')}

              <div className="flex items-center gap-3 rounded-xl border border-[#2C3B38] bg-[#101A26]/50 px-4 py-2.5">
                <input id="is_collateral" type="checkbox" checked={sourceForm.is_collateral}
                  onChange={(e) => setSourceForm((f) => ({ ...f, is_collateral: e.target.checked }))}
                  className="h-4 w-4 accent-[#C8AA8F] cursor-pointer" />
                <label htmlFor="is_collateral" className="cursor-pointer text-sm text-[#F0EDE8]">{cap.form.isCollateral}</label>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{cap.form.allocateTo}</label>
                <select
                  value={sourceForm.allocated_to_property_id}
                  onChange={(e) => {
                    const val = e.target.value
                    setSourceForm((f) => ({ ...f, allocated_to_property_id: val }))
                    checkDoubleAlloc(val, editSrc?.id ?? null)
                  }}
                  className={plainCls}
                >
                  <option value="" className="bg-[#172530]">{cap.form.allocateNone}</option>
                  {properties.map((pr) => (
                    <option key={pr.id} value={pr.id} className="bg-[#172530]">{pr.name}</option>
                  ))}
                </select>
              </div>

              {sourceForm.allocated_to_property_id && (
                sfld('allocated_amount', cap.form.allocatedAmount, 'number', '0')
              )}

              {doubleAllocPropName && (
                <AnalystAlert type="double_allocation" allocatedPropertyName={doubleAllocPropName} />
              )}

              {sfld('notes', cap.form.notes)}

              {sourceError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{sourceError}</p>}

              <div className={`flex gap-3 pt-1 ${editSrc ? 'justify-between' : ''}`}>
                {editSrc && (
                  <button type="button" onClick={handleDeleteSource}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20">
                    {cap.form.delete}
                  </button>
                )}
                <div className={`flex gap-3 ${editSrc ? '' : 'flex-1'}`}>
                  <button type="button" onClick={() => setSourceOpen(false)}
                    className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm font-medium text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                    {cap.form.cancel}
                  </button>
                  <button type="submit" disabled={isPending || !!doubleAllocPropName}
                    className="flex-1 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50 disabled:opacity-50">
                    {isPending ? cap.form.saving : cap.form.save}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
