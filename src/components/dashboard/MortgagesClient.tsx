'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  TrendingDown, Zap, Activity, AlertTriangle, X,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import AmortizationChart, { type Track } from './AmortizationChart'
import AnalystAlert from './AnalystAlert'

// ── Types ──────────────────────────────────────────────────────────────────

interface ExitPoint {
  id:          string
  date:        string
  description: string
}

interface Loan {
  id:                 string
  name:               string
  loan_type:          string
  lender:             string | null
  linked_property_id: string | null
  original_amount:    number
  remaining_balance:  number
  start_date:         string | null
  end_date:           string | null
  tracks:             Track[]
  monthly_payment:    number | null
  exit_points:        ExitPoint[]
  is_index_linked:    boolean
  index_base_rate:    number | null
  notes:              string | null
}

interface PropertyRef {
  id:   string
  name: string
}

interface Props {
  loans:         Loan[]
  properties:    PropertyRef[]
  totalAssets:   number   // sum of property current_value for equity gauge
}

// ── Market Benchmarks (Israeli market, 2025) ─────────────────────────────
const BENCHMARKS: Record<string, number> = {
  prime:        1.5,   // prime-based spread above Bank of Israel
  fixed:        3.8,   // typical fixed non-indexed
  index_linked: 2.2,   // typical fixed CPI-linked
  variable:     4.0,   // typical variable
}

// ── PMT ──────────────────────────────────────────────────────────────────
function pmt(principal: number, annualRate: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0
  if (annualRate === 0) return principal / months
  const r = annualRate / 100 / 12
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

// ── Months remaining from today to endDate ────────────────────────────────
function monthsUntil(dateStr: string | null): number {
  if (!dateStr) return 0
  const now  = new Date()
  const end  = new Date(dateStr)
  const diff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  return Math.max(0, diff)
}

// ── Efficiency Score ──────────────────────────────────────────────────────
type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

function loanEfficiency(loan: Loan): { grade: Grade; weightedGap: number; blendedRate: number } {
  if (!loan.tracks.length) return { grade: 'C', weightedGap: 0, blendedRate: 0 }

  const totalBalance = loan.tracks.reduce((s, t) => s + (t.remaining_balance || 0), 0)
  if (totalBalance === 0) return { grade: 'A', weightedGap: 0, blendedRate: 0 }

  let weightedRate  = 0
  let weightedBench = 0

  for (const track of loan.tracks) {
    const w     = (track.remaining_balance || 0) / totalBalance
    const bench = BENCHMARKS[track.track_type] ?? 3.5
    weightedRate  += w * (track.interest_rate || 0)
    weightedBench += w * bench
  }

  const gap = weightedRate - weightedBench
  let grade: Grade = 'A'
  if      (gap > 2.5) grade = 'F'
  else if (gap > 1.5) grade = 'D'
  else if (gap > 0.5) grade = 'C'
  else if (gap > 0)   grade = 'B'

  return { grade, weightedGap: gap, blendedRate: weightedRate }
}

const GRADE_COLORS: Record<Grade, string> = {
  A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  B: 'text-teal-400    bg-teal-500/10    border-teal-500/30',
  C: 'text-amber-400   bg-amber-500/10   border-amber-500/30',
  D: 'text-orange-400  bg-orange-500/10  border-orange-500/30',
  F: 'text-red-400     bg-red-500/10     border-red-500/30',
}

// ── Debt Destroyer simulation data ────────────────────────────────────────
function buildSimData(
  balance:       number,
  annualRate:    number,
  months:        number,
  extraPerMonth: number,
  currentLabel:  string,
  fastLabel:     string,
) {
  const base    = pmt(balance, annualRate, months)
  const data: { month: number; [key: string]: number }[] = []

  let balNormal = balance
  let balFast   = balance
  let interestNormal = 0
  let interestFast   = 0
  const r = annualRate / 100 / 12

  for (let m = 1; m <= months; m++) {
    const intN = balNormal * r
    const intF = balFast   * r
    interestNormal += intN
    interestFast   += intF

    balNormal = Math.max(0, balNormal - (base - intN))
    balFast   = Math.max(0, balFast   - (base + extraPerMonth - intF))

    if (m % 3 === 0 || m === months) {
      data.push({
        month:        m,
        [currentLabel]: Math.round(balNormal),
        [fastLabel]:    Math.round(balFast),
      })
    }
    if (balFast <= 0 && m < months) break
  }

  return { data, interestNormal, interestFast }
}

// ── Add months helper ─────────────────────────────────────────────────────
function addMonthsToDate(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

// ── Reverse interest rate (binary search) ─────────────────────────────────
function reverseInterestRate(payment: number, principal: number, months: number): number | null {
  if (payment <= 0 || principal <= 0 || months <= 0) return null
  if (Math.abs(payment - principal / months) < 1) return 0  // near-zero rate
  let lo = 0.0, hi = 30.0
  for (let i = 0; i < 100; i++) {
    const mid      = (lo + hi) / 2
    const computed = pmt(principal, mid, months)
    if (Math.abs(computed - payment) < 0.01) return mid
    if (computed < payment) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtILS = (n: number) => '₪' + Math.abs(Math.round(n)).toLocaleString('he-IL')
const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function newTrack(): Track {
  return {
    id: crypto.randomUUID(),
    name: '',
    track_type: 'fixed',
    original_amount: 0,
    remaining_balance: 0,
    interest_rate: 0,
    monthly_payment: 0,
  }
}

function newExit(): ExitPoint {
  return { id: crypto.randomUUID(), date: '', description: '' }
}

const EMPTY_FORM = {
  name:               '',
  loan_type:          'mortgage',
  lender:             '',
  linked_property_id: '',
  original_amount:    '',
  remaining_balance:  '',
  start_date:         '',
  end_date:           '',
  months_remaining:   '120',
  monthly_payment:    '',
  is_index_linked:    false,
  index_base_rate:    '',
  notes:              '',
}

// ── Tooltip ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SimTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#2C3B38] bg-[#1A2B29] px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-[#F0EDE8]">חודש {label}</p>
      {payload.map((p: { name: string; value: number; stroke: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.stroke }} />
            <span className="text-[#86968B]">{p.name}</span>
          </div>
          <span className="font-bold text-[#C8AA8F]">{fmtILS(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function MortgagesClient({ loans: initialLoans, properties, totalAssets }: Props) {
  const { t }       = useLang()
  const router      = useRouter()
  const [, startT]  = useTransition()
  const m           = t.mortgages
  const supabase    = createClient()

  // ── Local state ─────────────────────────────────────────────────────────
  const [loans, setLoans]               = useState<Loan[]>(initialLoans)
  const [activeTab, setActiveTab]       = useState<'overview' | 'simulator' | 'stress' | 'macro'>('overview')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [editLoan, setEditLoan]         = useState<Loan | null>(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [form, setForm]                 = useState({ ...EMPTY_FORM })
  const [formTracks, setFormTracks]     = useState<Track[]>([])
  const [formExits, setFormExits]       = useState<ExitPoint[]>([])
  const [simLoanId, setSimLoanId]       = useState<string>(initialLoans[0]?.id ?? '')
  const [extraPayment, setExtraPayment] = useState(1000)
  const [cpiDelta, setCpiDelta]         = useState(2)
  const [boiDelta, setBoiDelta]         = useState(0.25)

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const totalDebt = loans.reduce((s, l) => s + l.remaining_balance, 0)
  const totalMonthly = loans.reduce((s, l) => {
    if (l.monthly_payment) return s + l.monthly_payment
    const months = monthsUntil(l.end_date)
    const trackPmt = l.tracks.reduce((ts, tk) => ts + pmt(tk.remaining_balance, tk.interest_rate, months), 0)
    return s + (trackPmt || 0)
  }, 0)
  const avgRate = loans.length
    ? loans.reduce((s, l) => {
        const scores = loanEfficiency(l)
        return s + scores.blendedRate * l.remaining_balance
      }, 0) / (totalDebt || 1)
    : 0
  const equityPct = totalAssets > 0 ? Math.max(0, Math.min(100, ((totalAssets - totalDebt) / totalAssets) * 100)) : 0

  // ── Open / close form ────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...EMPTY_FORM })
    setFormTracks([])
    setFormExits([])
    setEditLoan(null)
    setShowForm(true)
  }

  const openEdit = (loan: Loan) => {
    setForm({
      name:               loan.name,
      loan_type:          loan.loan_type,
      lender:             loan.lender ?? '',
      linked_property_id: loan.linked_property_id ?? '',
      original_amount:    String(loan.original_amount),
      remaining_balance:  String(loan.remaining_balance),
      start_date:         loan.start_date ?? '',
      end_date:           loan.end_date ?? '',
      months_remaining:   String(monthsUntil(loan.end_date) || 120),
      monthly_payment:    loan.monthly_payment != null ? String(loan.monthly_payment) : '',
      is_index_linked:    loan.is_index_linked,
      index_base_rate:    loan.index_base_rate != null ? String(loan.index_base_rate) : '',
      notes:              loan.notes ?? '',
    })
    setFormTracks(loan.tracks ?? [])
    setFormExits(loan.exit_points ?? [])
    setEditLoan(loan)
    setShowForm(true)
  }

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditLoan(null)
  }, [])

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const monthsRem = parseInt(form.months_remaining) || 120
    const trackSum  = formTracks.reduce((s, tk) => s + pmt(tk.remaining_balance, tk.interest_rate, monthsRem), 0)
    const endDate   = addMonthsToDate(new Date(), monthsRem).toISOString().slice(0, 10)

    const payload = {
      user_id:            user.id,
      name:               form.name.trim(),
      loan_type:          form.loan_type,
      lender:             form.lender.trim() || null,
      linked_property_id: form.linked_property_id || null,
      original_amount:    parseFloat(form.original_amount)   || 0,
      remaining_balance:  parseFloat(form.remaining_balance) || 0,
      start_date:         form.start_date || null,
      end_date:           endDate,
      tracks:             formTracks,
      monthly_payment:    form.monthly_payment ? parseFloat(form.monthly_payment) : trackSum || null,
      exit_points:        formExits,
      is_index_linked:    form.is_index_linked,
      index_base_rate:    form.index_base_rate ? parseFloat(form.index_base_rate) : null,
      notes:              form.notes.trim() || null,
    }

    if (editLoan) {
      const { data } = await supabase
        .from('loans')
        .update(payload)
        .eq('id', editLoan.id)
        .select()
        .single()
      if (data) setLoans(prev => prev.map(l => l.id === editLoan.id ? (data as Loan) : l))
    } else {
      const { data } = await supabase
        .from('loans')
        .insert(payload)
        .select()
        .single()
      if (data) setLoans(prev => [data as Loan, ...prev])
    }

    setSaving(false)
    closeForm()
    startT(() => router.refresh())
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(id)
    await supabase.from('loans').delete().eq('id', id)
    setLoans(prev => prev.filter(l => l.id !== id))
    setDeleting(null)
    startT(() => router.refresh())
  }

  // ── Simulator data ────────────────────────────────────────────────────────
  const simLoan    = loans.find(l => l.id === simLoanId) ?? loans[0]
  const simMonths  = simLoan ? monthsUntil(simLoan.end_date) : 0
  const simBalance = simLoan?.remaining_balance ?? 0
  const simRate    = simLoan ? loanEfficiency(simLoan).blendedRate : 0

  const { data: simData, interestNormal, interestFast } = simLoan && simMonths > 0
    ? buildSimData(simBalance, simRate, simMonths, extraPayment, m.simulator.currentPath, m.simulator.fastPath)
    : { data: [], interestNormal: 0, interestFast: 0 }

  const interestSaved = Math.max(0, interestNormal - interestFast)
  const fastPayoffMonth = simData.findIndex(d => d[m.simulator.fastPath] <= 0)
  const timeSaved = fastPayoffMonth >= 0
    ? simMonths - simData[fastPayoffMonth].month
    : simMonths - (simData[simData.length - 1]?.month ?? simMonths)

  // ── Stress test ────────────────────────────────────────────────────────────
  const indexedLoans = loans.filter(l => l.is_index_linked)
  const stressImpact = indexedLoans.reduce((sum, l) => {
    const months  = monthsUntil(l.end_date)
    const base    = pmt(l.remaining_balance, (l.index_base_rate ?? 2), months)
    const stressed = pmt(l.remaining_balance, (l.index_base_rate ?? 2) + cpiDelta, months)
    return sum + (stressed - base)
  }, 0)

  // ── BOI Macro simulation ─────────────────────────────────────────────────
  const boiLoanBreakdown = loans.map(loan => {
    const months = monthsUntil(loan.end_date)
    const affectedTracks = loan.tracks.filter(t =>
      t.track_type === 'prime' || t.track_type === 'variable'
    )
    if (affectedTracks.length === 0 || months <= 0) return null
    const currentPmt = affectedTracks.reduce((s, t) => s + pmt(t.remaining_balance, t.interest_rate, months), 0)
    const newPmt     = affectedTracks.reduce((s, t) => s + pmt(t.remaining_balance, t.interest_rate + boiDelta, months), 0)
    return { loan, affectedTracks, delta: newPmt - currentPmt }
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  const boiTotalImpact = boiLoanBreakdown.reduce((s, item) => s + item.delta, 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#101A26]">
      {/* Header */}
      <div className="border-b border-[#2C3B38] bg-[#172530] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#445147]">{m.section}</p>
            <h1 className="mt-1 text-xl font-bold text-[#F0EDE8]">{m.title}</h1>
            <p className="mt-0.5 text-sm text-[#86968B]">{m.subtitle}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-[#C8AA8F] px-4 py-2 text-sm font-semibold text-[#101A26] transition-opacity hover:opacity-90"
          >
            <Plus size={15} />
            {m.addButton}
          </button>
        </div>

        {/* KPI cards */}
        {loans.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: m.summary.totalDebt,      value: fmtILS(totalDebt),                color: 'text-red-400' },
              { label: m.summary.monthlyPayment,  value: fmtILS(totalMonthly),             color: 'text-[#C8AA8F]' },
              { label: m.summary.avgRate,         value: `${avgRate.toFixed(2)}%`,          color: 'text-amber-400' },
              { label: m.summary.equityPct,       value: `${equityPct.toFixed(1)}%`,        color: 'text-emerald-400' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-[#2C3B38] bg-[#101A26]/60 px-4 py-3">
                <p className="text-xs text-[#445147]">{kpi.label}</p>
                <p className={`mt-1 text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      {loans.length > 0 && (
        <div className="flex gap-1 border-b border-[#2C3B38] bg-[#172530] px-6">
          {(['overview', 'simulator', 'stress', 'macro'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-[#C8AA8F] text-[#C8AA8F]'
                  : 'text-[#86968B] hover:text-[#F0EDE8]'
              }`}
            >
              {m.tabs[tab]}
            </button>
          ))}
        </div>
      )}

      <div className="p-6">
        {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Equity Gauge */}
            {loans.length > 0 && totalAssets > 0 && (
              <div className="mb-6 rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
                <p className="text-xs font-semibold tracking-widest text-[#445147]">{m.equity.title}</p>
                <p className="mt-0.5 text-xs text-[#86968B]">{m.equity.subtitle}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-4 w-full overflow-hidden rounded-full bg-[#2C3B38]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                        style={{ width: `${equityPct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-[#86968B]">
                      <span>{m.equity.owned}: {fmtILS(totalAssets - totalDebt)}</span>
                      <span>{m.equity.financed}: {fmtILS(totalDebt)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">{equityPct.toFixed(1)}%</p>
                    <p className="text-xs text-[#445147]">{m.equity.owned}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Amortization chart */}
            {loans.length > 0 && (
              <div className="mb-6 rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
                <AmortizationChart
                  tracks={loans.flatMap(l => l.tracks)}
                  remainingMonths={Math.max(...loans.map(l => monthsUntil(l.end_date)), 1)}
                  principalLabel={m.amortChart.principal}
                  interestLabel={m.amortChart.interest}
                  title={m.amortChart.title}
                  subtitle={`${t.mortgages.amortChart.year} — ${t.mortgages.subtitle}`}
                />
              </div>
            )}

            {/* Loan Cards */}
            {loans.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#2C3B38] bg-[#172530]">
                  <TrendingDown size={28} className="text-[#445147]" />
                </div>
                <p className="text-base font-semibold text-[#F0EDE8]">{m.emptyTitle}</p>
                <p className="text-sm text-[#445147]">{m.emptyHint}</p>
                <button
                  onClick={openAdd}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-[#C8AA8F] px-4 py-2 text-sm font-semibold text-[#101A26] transition-opacity hover:opacity-90"
                >
                  <Plus size={14} />
                  {m.addButton}
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {loans.map(loan => {
                  const { grade, blendedRate } = loanEfficiency(loan)
                  const months = monthsUntil(loan.end_date)
                  const calcMonthly = loan.monthly_payment
                    ?? loan.tracks.reduce((s, tk) => s + pmt(tk.remaining_balance, tk.interest_rate, months), 0)
                  const expanded = expandedId === loan.id
                  const propName = properties.find(p => p.id === loan.linked_property_id)?.name

                  // Refinance opportunity alert?
                  const { weightedGap } = loanEfficiency(loan)
                  const pmtRatioPerM = loan.remaining_balance > 0
                    ? calcMonthly / (loan.remaining_balance / 1_000_000)
                    : 0
                  const triggerReason: 'pmt_ratio' | 'gap' | null =
                    pmtRatioPerM > 5_000 && months > 0 ? 'pmt_ratio'
                    : weightedGap > 1.0 && calcMonthly > 0 ? 'gap'
                    : null
                  const showRefi = triggerReason !== null
                  const potentialSaving = showRefi
                    ? Math.abs(pmt(loan.remaining_balance, blendedRate - (weightedGap > 0 ? weightedGap - 0.5 : 0), months) - calcMonthly)
                    : 0

                  return (
                    <div
                      key={loan.id}
                      className="rounded-2xl border border-[#2C3B38] bg-[#172530] overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-[#F0EDE8]">{loan.name}</h3>
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${GRADE_COLORS[grade]}`}>
                                {m.card.efficiency} {grade}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[#86968B]">
                              {m.loanTypes[loan.loan_type] ?? loan.loan_type}
                              {loan.lender ? ` · ${loan.lender}` : ''}
                              {propName ? ` · ${propName}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => openEdit(loan)}
                              className="rounded-lg p-1.5 text-[#86968B] transition-colors hover:bg-[#2C3B38] hover:text-[#F0EDE8]"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(loan.id)}
                              disabled={deleting === loan.id}
                              className="rounded-lg p-1.5 text-[#86968B] transition-colors hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Key metrics row */}
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-[#445147]">{m.card.remaining}</p>
                            <p className="mt-0.5 text-sm font-bold text-red-400">{fmtILS(loan.remaining_balance)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#445147]">{m.card.monthly}</p>
                            <p className="mt-0.5 text-sm font-bold text-[#C8AA8F]">{fmtILS(calcMonthly)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#445147]">{m.card.endDate}</p>
                            <p className="mt-0.5 text-sm font-bold text-[#F0EDE8]">{fmtDate(loan.end_date)}</p>
                          </div>
                        </div>

                        {/* Refinance alert */}
                        {showRefi && (
                          <div className="mt-3">
                            <AnalystAlert
                              type="refinance_opportunity"
                              potentialSaving={potentialSaving}
                              userRate={blendedRate}
                              marketRate={blendedRate - weightedGap}
                              triggerReason={triggerReason ?? undefined}
                            />
                          </div>
                        )}

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedId(expanded ? null : loan.id)}
                          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-[#2C3B38] py-1.5 text-xs text-[#86968B] transition-colors hover:bg-[#2C3B38]/50"
                        >
                          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {expanded ? 'הסתר פרטים' : 'פרטים'}
                        </button>
                      </div>

                      {/* Expanded details */}
                      {expanded && (
                        <div className="border-t border-[#2C3B38] bg-[#101A26]/50 p-5 space-y-4">
                          {/* Tracks */}
                          {loan.tracks.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold tracking-widest text-[#445147]">{m.card.tracks}</p>
                              <div className="space-y-2">
                                {loan.tracks.map(tk => (
                                  <div key={tk.id} className="flex items-center justify-between rounded-lg bg-[#172530]/80 px-3 py-2 text-xs">
                                    <div>
                                      <span className="font-medium text-[#F0EDE8]">{m.trackTypes[tk.track_type] ?? tk.track_type}</span>
                                      {tk.name && <span className="ml-1 text-[#86968B]">({tk.name})</span>}
                                    </div>
                                    <div className="flex gap-3 text-[#86968B]">
                                      <span>{tk.interest_rate}%</span>
                                      <span className="text-[#C8AA8F] font-medium">{fmtILS(tk.remaining_balance)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Exit points */}
                          {loan.exit_points.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold tracking-widest text-[#445147]">{m.card.exitPoints}</p>
                              <div className="space-y-1">
                                {loan.exit_points.map(ep => (
                                  <div key={ep.id} className="flex items-center gap-2 text-xs text-[#86968B]">
                                    <Zap size={10} className="text-amber-400 shrink-0" />
                                    <span className="font-medium text-[#F0EDE8]">{fmtDate(ep.date)}</span>
                                    {ep.description && <span>— {ep.description}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reverse interest rate badge */}
                          {loan.monthly_payment != null && months > 0 && (() => {
                            const rate = reverseInterestRate(loan.monthly_payment, loan.remaining_balance, months)
                            return rate != null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#86968B]">{m.card.reverseRate}:</span>
                                <span className="rounded-full border border-[#C8AA8F]/40 bg-[#C8AA8F]/10 px-2.5 py-0.5 text-xs font-bold text-[#C8AA8F]">
                                  {rate.toFixed(2)}%
                                </span>
                              </div>
                            ) : null
                          })()}

                          {/* Efficiency score detail */}
                          <div>
                            <p className="mb-2 text-xs font-semibold tracking-widest text-[#445147]">{m.score.title}</p>
                            <div className="flex items-center justify-between rounded-lg bg-[#172530]/80 px-3 py-2">
                              <div className="space-y-0.5">
                                <p className="text-xs text-[#86968B]">{m.score.yourRate}: <span className="font-bold text-[#F0EDE8]">{blendedRate.toFixed(2)}%</span></p>
                                <p className="text-xs text-[#86968B]">{m.score.gradeLabel}: <span className={`font-bold ${GRADE_COLORS[grade].split(' ')[0]}`}>{grade}</span></p>
                              </div>
                              <div className={`rounded-xl border px-4 py-2 text-2xl font-black ${GRADE_COLORS[grade]}`}>
                                {grade}
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-[#86968B]">{m.score.grades[grade]}</p>
                          </div>

                          {loan.notes && (
                            <p className="text-xs text-[#86968B] leading-relaxed">{loan.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── SIMULATOR TAB ─────────────────────────────────────── */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
              <p className="text-xs font-semibold tracking-widest text-[#445147]">{m.simulator.title}</p>
              <p className="mt-0.5 mb-4 text-xs text-[#86968B]">{m.simulator.subtitle}</p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Loan selector */}
                <div>
                  <label className="block mb-1 text-xs text-[#86968B]">{m.simulator.selectLoan}</label>
                  <select
                    value={simLoanId}
                    onChange={e => setSimLoanId(e.target.value)}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  >
                    {loans.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {/* Extra payment slider */}
                <div>
                  <label className="block mb-1 text-xs text-[#86968B]">
                    {m.simulator.extraPayment}: <span className="font-bold text-[#C8AA8F]">{fmtILS(extraPayment)}</span>
                  </label>
                  <input
                    type="range"
                    min={500}
                    max={10000}
                    step={500}
                    value={extraPayment}
                    onChange={e => setExtraPayment(Number(e.target.value))}
                    className="w-full accent-[#C8AA8F]"
                  />
                  <div className="flex justify-between text-xs text-[#445147]">
                    <span>₪500</span>
                    <span>₪10,000</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              {simData.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-xs text-[#86968B]">{m.simulator.saved}</p>
                    <p className="mt-1 text-xl font-bold text-amber-400">{fmtILS(interestSaved)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-xs text-[#86968B]">{m.simulator.timeSaved}</p>
                    <p className="mt-1 text-xl font-bold text-emerald-400">{timeSaved} {m.simulator.months}</p>
                  </div>
                </div>
              )}

              {/* Dual-line chart */}
              {simData.length > 0 && (
                <div className="mt-5 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2C3B38" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#86968B', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `${v}`}
                      />
                      <YAxis
                        tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v/1000)}k` : String(v)}
                        tick={{ fill: '#445147', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                      />
                      <Tooltip content={<SimTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#86968B', paddingTop: 8 }} iconType="circle" iconSize={8} />
                      <Line dataKey={m.simulator.currentPath} stroke="#86968B" strokeWidth={2} dot={false} />
                      <Line dataKey={m.simulator.fastPath}    stroke="#C8AA8F" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {loans.length === 0 && (
                <p className="mt-4 text-center text-sm text-[#445147]">{m.emptyHint}</p>
              )}
            </div>
          </div>
        )}

        {/* ── STRESS TEST TAB ───────────────────────────────────── */}
        {activeTab === 'stress' && (
          <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
            <p className="text-xs font-semibold tracking-widest text-[#445147]">{m.stress.title}</p>
            <p className="mt-0.5 mb-5 text-xs text-[#86968B]">{m.stress.subtitle}</p>

            {indexedLoans.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#2C3B38] bg-[#101A26]/40 p-4">
                <Activity size={16} className="text-[#445147]" />
                <p className="text-sm text-[#445147]">{m.stress.noIndexed}</p>
              </div>
            ) : (
              <>
                {/* CPI slider */}
                <div className="mb-6">
                  <label className="block mb-1 text-xs text-[#86968B]">
                    {m.stress.cpiLabel}: <span className="font-bold text-[#C8AA8F]">{cpiDelta}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.5}
                    value={cpiDelta}
                    onChange={e => setCpiDelta(Number(e.target.value))}
                    className="w-full accent-[#C8AA8F]"
                  />
                  <div className="flex justify-between text-xs text-[#445147]">
                    <span>0.5%</span>
                    <span>8%</span>
                  </div>
                </div>

                {/* Total portfolio impact */}
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <p className="text-xs text-[#86968B]">{m.stress.totalImpact}</p>
                  <p className="mt-1 text-2xl font-bold text-red-400">+{fmtILS(stressImpact)} / חודש</p>
                </div>

                {/* Per-loan breakdown */}
                <div className="space-y-3">
                  {indexedLoans.map(l => {
                    const months = monthsUntil(l.end_date)
                    const base     = pmt(l.remaining_balance, l.index_base_rate ?? 2, months)
                    const stressed = pmt(l.remaining_balance, (l.index_base_rate ?? 2) + cpiDelta, months)
                    const delta    = stressed - base
                    return (
                      <div key={l.id} className="flex items-center justify-between rounded-xl border border-[#2C3B38] bg-[#101A26]/40 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[#F0EDE8]">{l.name}</p>
                          <p className="text-xs text-[#86968B]">{m.stress.impact}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-400">+{fmtILS(delta)}</p>
                          <p className="text-xs text-[#86968B]">/ חודש</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
        {/* ── MACRO TAB ─────────────────────────────────────────── */}
        {activeTab === 'macro' && (
          <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
            <p className="text-xs font-semibold tracking-widest text-[#445147]">{m.macro.title}</p>
            <p className="mt-0.5 mb-5 text-xs text-[#86968B]">{m.macro.subtitle}</p>

            {boiLoanBreakdown.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#2C3B38] bg-[#101A26]/40 p-4">
                <Activity size={16} className="text-[#445147]" />
                <p className="text-sm text-[#445147]">{m.macro.noAffected}</p>
              </div>
            ) : (
              <>
                {/* Slider */}
                <div className="mb-6">
                  <label className="block mb-1 text-xs text-[#86968B]">
                    {m.macro.slider}:{' '}
                    <span className={`font-bold ${boiDelta >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {boiDelta >= 0 ? '+' : ''}{boiDelta.toFixed(2)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min={-1.0}
                    max={2.0}
                    step={0.25}
                    value={boiDelta}
                    onChange={e => setBoiDelta(Number(e.target.value))}
                    className="w-full accent-[#C8AA8F]"
                  />
                  <div className="flex justify-between text-xs text-[#445147]">
                    <span>-1.00%</span>
                    <span>+2.00%</span>
                  </div>
                </div>

                {/* Hero impact */}
                <div className={`mb-5 rounded-xl border px-4 py-3 ${boiTotalImpact >= 0 ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                  <p className="text-xs text-[#86968B]">{m.macro.impact}</p>
                  <p className={`mt-1 text-2xl font-bold ${boiTotalImpact >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {boiTotalImpact >= 0 ? '+' : ''}{fmtILS(boiTotalImpact)} / חודש
                  </p>
                </div>

                {/* Per-loan breakdown */}
                <div>
                  <p className="mb-3 text-xs font-semibold tracking-widest text-[#445147]">{m.macro.perLoanBreakdown}</p>
                  <div className="space-y-2">
                    {boiLoanBreakdown.map(item => (
                      <div key={item.loan.id} className="flex items-center justify-between rounded-xl border border-[#2C3B38] bg-[#101A26]/40 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[#F0EDE8]">{item.loan.name}</p>
                          <p className="text-xs text-[#86968B]">
                            {m.macro.affectedTracks}: {item.affectedTracks.map(t => m.trackTypes[t.track_type]).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${item.delta >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {item.delta >= 0 ? '+' : ''}{fmtILS(item.delta)}
                          </p>
                          <p className="text-xs text-[#86968B]">/ חודש</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[#445147]">{m.macro.affectedNote}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Form Modal ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-10 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#2C3B38] bg-[#172530] shadow-2xl">
            {/* Form header */}
            <div className="flex items-center justify-between border-b border-[#2C3B38] px-6 py-4">
              <h2 className="text-base font-semibold text-[#F0EDE8]">
                {editLoan ? m.form.editTitle : m.form.addTitle}
              </h2>
              <button onClick={closeForm} className="text-[#86968B] hover:text-[#F0EDE8]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Name + type */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.name}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={m.form.namePlaceholder}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                    dir="auto"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.loanType}</label>
                  <select
                    value={form.loan_type}
                    onChange={e => setForm(f => ({ ...f, loan_type: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  >
                    {Object.entries(m.loanTypes).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lender + property */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.lender}</label>
                  <input
                    type="text"
                    value={form.lender}
                    onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
                    placeholder={m.form.lenderPlaceholder}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                    dir="auto"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.linkedProperty}</label>
                  <select
                    value={form.linked_property_id}
                    onChange={e => setForm(f => ({ ...f, linked_property_id: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  >
                    <option value="">{m.form.propertyNone}</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.originalAmount}</label>
                  <input
                    type="number"
                    value={form.original_amount}
                    onChange={e => setForm(f => ({ ...f, original_amount: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.remainingBalance}</label>
                  <input
                    type="number"
                    value={form.remaining_balance}
                    onChange={e => setForm(f => ({ ...f, remaining_balance: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Start date + months remaining + monthly payment */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.startDate}</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.monthsRemaining}</label>
                  <input
                    type="number"
                    min={12}
                    max={360}
                    step={1}
                    value={form.months_remaining}
                    onChange={e => setForm(f => ({ ...f, months_remaining: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.monthlyPayment}</label>
                  <input
                    type="number"
                    value={form.monthly_payment}
                    onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Index linkage */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_index_linked}
                    onChange={e => setForm(f => ({ ...f, is_index_linked: e.target.checked }))}
                    className="accent-[#C8AA8F]"
                  />
                  <span className="text-sm text-[#F0EDE8]">{m.form.isIndexLinked}</span>
                </label>
                {form.is_index_linked && (
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.1"
                      value={form.index_base_rate}
                      onChange={e => setForm(f => ({ ...f, index_base_rate: e.target.value }))}
                      placeholder={m.form.indexBaseRate}
                      className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* ── Tracks ──────────────────────────────────────────── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-widest text-[#445147]">{m.form.tracksTitle}</p>
                  <button
                    onClick={() => setFormTracks(t => [...t, newTrack()])}
                    className="text-xs font-medium text-[#C8AA8F] hover:text-[#F0EDE8] transition-colors"
                  >
                    {m.form.addTrack}
                  </button>
                </div>
                <div className="space-y-3">
                  {formTracks.map((tk, i) => (
                    <div key={tk.id} className="rounded-xl border border-[#2C3B38] bg-[#101A26]/50 p-3">
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                        <select
                          value={tk.track_type}
                          onChange={e => setFormTracks(ts => ts.map((t, j) => j === i ? { ...t, track_type: e.target.value } : t))}
                          className="rounded-lg border border-[#2C3B38] bg-[#101A26] px-2 py-1.5 text-xs text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                        >
                          {Object.entries(m.trackTypes).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={tk.interest_rate || ''}
                          onChange={e => setFormTracks(ts => ts.map((t, j) => j === i ? { ...t, interest_rate: parseFloat(e.target.value) || 0 } : t))}
                          placeholder={m.form.trackRate}
                          className="rounded-lg border border-[#2C3B38] bg-[#101A26] px-2 py-1.5 text-xs text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                        />
                        <input
                          type="number"
                          value={tk.remaining_balance || ''}
                          onChange={e => setFormTracks(ts => ts.map((t, j) => j === i ? { ...t, remaining_balance: parseFloat(e.target.value) || 0 } : t))}
                          placeholder={m.form.trackBalance}
                          className="rounded-lg border border-[#2C3B38] bg-[#101A26] px-2 py-1.5 text-xs text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={tk.monthly_payment || ''}
                            onChange={e => setFormTracks(ts => ts.map((t, j) => j === i ? { ...t, monthly_payment: parseFloat(e.target.value) || 0 } : t))}
                            placeholder={m.form.trackPayment}
                            className="flex-1 rounded-lg border border-[#2C3B38] bg-[#101A26] px-2 py-1.5 text-xs text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                          />
                          <button
                            onClick={() => setFormTracks(ts => ts.filter((_, j) => j !== i))}
                            className="rounded-lg p-1.5 text-[#86968B] hover:text-red-400 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Exit Points ─────────────────────────────────────── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-widest text-[#445147]">{m.form.exitPointsTitle}</p>
                  <button
                    onClick={() => setFormExits(e => [...e, newExit()])}
                    className="text-xs font-medium text-[#C8AA8F] hover:text-[#F0EDE8] transition-colors"
                  >
                    {m.form.addExit}
                  </button>
                </div>
                <div className="space-y-2">
                  {formExits.map((ep, i) => (
                    <div key={ep.id} className="flex items-center gap-2">
                      <input
                        type="date"
                        value={ep.date}
                        onChange={e => setFormExits(es => es.map((ex, j) => j === i ? { ...ex, date: e.target.value } : ex))}
                        className="rounded-lg border border-[#2C3B38] bg-[#101A26] px-2 py-1.5 text-xs text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={ep.description}
                        onChange={e => setFormExits(es => es.map((ex, j) => j === i ? { ...ex, description: e.target.value } : ex))}
                        placeholder={m.form.exitDesc}
                        className="flex-1 rounded-lg border border-[#2C3B38] bg-[#101A26] px-2 py-1.5 text-xs text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                        dir="auto"
                      />
                      <button
                        onClick={() => setFormExits(es => es.filter((_, j) => j !== i))}
                        className="text-[#86968B] hover:text-red-400 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{m.form.notes}</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none resize-none"
                  dir="auto"
                />
              </div>

              {/* Form actions */}
              <div className="flex items-center justify-between gap-3 border-t border-[#2C3B38] pt-4">
                {editLoan && (
                  <button
                    onClick={() => handleDelete(editLoan.id)}
                    disabled={deleting === editLoan.id}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    {m.form.delete}
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={closeForm}
                    className="rounded-xl border border-[#2C3B38] px-4 py-2 text-sm text-[#86968B] transition-colors hover:bg-[#2C3B38]/50"
                  >
                    {m.form.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#C8AA8F] px-5 py-2 text-sm font-semibold text-[#101A26] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {saving && <span className="animate-spin">↻</span>}
                    {saving ? m.form.saving : m.form.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warn if no loans and stress/sim tab */}
      {loans.length === 0 && activeTab !== 'overview' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 mx-6 p-4">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm text-[#86968B]">{m.emptyHint}</p>
        </div>
      )}
    </div>
  )
}
