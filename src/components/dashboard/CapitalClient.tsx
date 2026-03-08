'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Plus, X, Pencil, Trash2, Lock, Unlock, ShieldCheck, ShieldOff,
  TrendingUp, Calendar, Coins, AlertTriangle, CheckCircle2, Zap,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import AnalystAlert from './AnalystAlert'

const LiquidityChart = dynamic(() => import('./LiquidityChart'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────

type SourceType = 'study_fund' | 'provident_fund' | 'savings' | 'property_equity' | 'pension'

export interface CapitalSource {
  id: string
  name: string
  source_type: SourceType
  current_balance: number
  estimated_yield: number
  liquidity_date: string | null
  is_collateral: boolean
  allocated_to_property_id: string | null
  allocated_amount: number | null
  notes: string | null
  created_at: string
}

export interface PropertyRef {
  id: string
  name: string
  property_type: string
  completion_funding_source: string | null
  completion_amount: number | null
  delivery_equity: number | null
  target_exit_date: string | null
}

interface Props {
  sources: CapitalSource[]
  properties: PropertyRef[]
  netCashFlow: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const SOURCE_TYPES: SourceType[] = ['study_fund', 'provident_fund', 'savings', 'property_equity', 'pension']

const SOURCE_TYPE_COLORS: Record<SourceType, string> = {
  study_fund:      'bg-blue-500/15 text-blue-400 border-blue-500/20',
  provident_fund:  'bg-purple-500/15 text-purple-400 border-purple-500/20',
  savings:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  property_equity: 'bg-[#C8AA8F]/15 text-[#C8AA8F] border-[#C8AA8F]/20',
  pension:         'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
}

const PROJECT_TYPES = new Set(['first_hand'])

// ── Helpers ────────────────────────────────────────────────────────────────

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

const fmtILS = (n: number) =>
  '₪' + Math.round(Math.abs(n)).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const fmtPct = (n: number) => `${n.toFixed(1)}%`

const fmtDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Empty form ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
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
type FormState = typeof EMPTY_FORM

// ── Summary card ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#2C3B38] bg-[#172530] px-5 py-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-semibold tracking-widest text-[#445147]">{label}</p>
        <p className={`mt-0.5 text-xl font-bold tracking-tight text-[#F0EDE8]`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-[#86968B]">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function CapitalClient({ sources: initial, properties, netCashFlow }: Props) {
  const router  = useRouter()
  const { t }   = useLang()
  const cap     = t.capital

  const [isPending, startTransition] = useTransition()
  const [open,     setOpen]          = useState(false)
  const [editSrc,  setEditSrc]       = useState<CapitalSource | null>(null)
  const [form,     setForm]          = useState<FormState>(EMPTY_FORM)
  const [error,    setError]         = useState<string | null>(null)
  const [doubleAllocPropName, setDoubleAllocPropName] = useState<string | null>(null)
  const [analystOpen, setAnalystOpen] = useState(true)

  const today = new Date()

  // ── Derived totals ────────────────────────────────────────────────────────

  const availableNow = initial
    .filter((s) => !s.allocated_to_property_id && (!s.liquidity_date || new Date(s.liquidity_date) <= today))
    .reduce((sum, s) => sum + s.current_balance, 0)

  const locked = initial
    .filter((s) => !!s.allocated_to_property_id)
    .reduce((sum, s) => sum + (s.allocated_amount ?? s.current_balance), 0)

  const totalFutureValue = initial.reduce((sum, s) => {
    const months = monthsDiff(today, s.liquidity_date ?? null)
    return sum + futureValue(s.current_balance, s.estimated_yield, Math.max(0, months))
  }, 0)

  const collateralTotal = initial
    .filter((s) => s.is_collateral)
    .reduce((sum, s) => sum + s.current_balance, 0)

  // ── Leverage advisor: identify project gaps + collateral suggestions ──────

  const projectGaps = properties
    .filter((p) => PROJECT_TYPES.has(p.property_type) && p.completion_funding_source === 'monthly_savings')
    .map((p) => {
      const completionAmt  = p.completion_amount ?? p.delivery_equity ?? 0
      const months         = monthsDiff(today, p.target_exit_date)
      const required       = months > 0 ? completionAmt / months : completionAmt
      const gap            = required - netCashFlow
      return { prop: p, required, gap, months }
    })
    .filter((x) => x.gap > 0)

  const unallocatedCollateral = initial.filter((s) => s.is_collateral && !s.allocated_to_property_id)

  // ── Double-allocation guard (runs on form change) ─────────────────────────

  const checkDoubleAlloc = (newPropId: string, sourceId: string | null) => {
    if (!newPropId) { setDoubleAllocPropName(null); return }
    // Check if any OTHER source already has this property allocated
    const conflict = initial.find(
      (s) => s.allocated_to_property_id === newPropId && s.id !== sourceId
    )
    if (conflict) {
      const propName = properties.find((p) => p.id === newPropId)?.name ?? newPropId
      setDoubleAllocPropName(propName)
    } else {
      setDoubleAllocPropName(null)
    }
  }

  // ── Open add / edit ───────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditSrc(null)
    setError(null)
    setDoubleAllocPropName(null)
    setOpen(true)
  }

  const openEdit = (src: CapitalSource) => {
    setForm({
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
    setEditSrc(src)
    setError(null)
    setDoubleAllocPropName(null)
    setOpen(true)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (doubleAllocPropName) { setError(cap.analyst.doubleAlloc(doubleAllocPropName)); return }
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError(cap.form.notAuth); return }

    const payload = {
      user_id:                  user.id,
      name:                     form.name.trim(),
      source_type:              form.source_type,
      current_balance:          parseFloat(form.current_balance) || 0,
      estimated_yield:          parseFloat(form.estimated_yield) || 5,
      liquidity_date:           form.liquidity_date || null,
      is_collateral:            form.is_collateral,
      allocated_to_property_id: form.allocated_to_property_id || null,
      allocated_amount:         form.allocated_amount ? parseFloat(form.allocated_amount) : null,
      notes:                    form.notes.trim() || null,
    }

    const { error: dbErr } = editSrc
      ? await supabase.from('capital_sources').update(payload).eq('id', editSrc.id)
      : await supabase.from('capital_sources').insert(payload)

    if (dbErr) { setError(dbErr.message); return }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!editSrc) return
    const supabase = createClient()
    await supabase.from('capital_sources').delete().eq('id', editSrc.id)
    setOpen(false)
    startTransition(() => router.refresh())
  }

  // ── Input helper ───────────────────────────────────────────────────────────

  const baseCls = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 px-4 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-colors focus:border-[#C8AA8F]/50 focus:ring-1 focus:ring-[#C8AA8F]/20'

  const fld = (
    key: keyof FormState,
    label: string,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={baseCls}
      />
    </div>
  )

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartSources = initial.map((s) => ({
    id:                       s.id,
    name:                     s.name,
    current_balance:          s.current_balance,
    estimated_yield:          s.estimated_yield,
    liquidity_date:           s.liquidity_date,
    allocated_to_property_id: s.allocated_to_property_id,
    allocated_amount:         s.allocated_amount,
  }))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-6 lg:p-10">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{cap.section}</p>
          <h1 className="text-2xl font-semibold text-[#F0EDE8]">{cap.title}</h1>
          <p className="mt-1 text-sm text-[#86968B]">{cap.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 px-4 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50"
        >
          <Plus size={16} />{cap.addButton}
        </button>
      </div>

      {/* ── Summary ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={cap.summary.availableNow}
          value={fmtILS(availableNow)}
          icon={Unlock}
          color="border-emerald-500/20 bg-emerald-500/8 text-emerald-400"
        />
        <SummaryCard
          label={cap.summary.locked}
          value={fmtILS(locked)}
          icon={Lock}
          color="border-amber-500/20 bg-amber-500/8 text-amber-400"
        />
        <SummaryCard
          label={cap.summary.futureValue}
          value={fmtILS(totalFutureValue)}
          icon={TrendingUp}
          color="border-blue-500/20 bg-blue-500/8 text-blue-400"
        />
        <SummaryCard
          label={cap.summary.collateral}
          value={fmtILS(collateralTotal)}
          icon={ShieldCheck}
          color="border-[#C8AA8F]/20 bg-[#C8AA8F]/8 text-[#C8AA8F]"
        />
      </div>

      {/* ── Analyst / Leverage Advisor ── */}
      {(projectGaps.length > 0 || unallocatedCollateral.length > 0) && (
        <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8AA8F]/30 bg-[#C8AA8F]/15">
                <span className="text-xs font-bold text-[#C8AA8F]">AI</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#C8AA8F]">{cap.analyst.title}</p>
                <p className="text-xs text-[#86968B]">{cap.analyst.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setAnalystOpen((o) => !o)}
              className="text-[#86968B] transition-colors hover:text-[#F0EDE8]"
            >
              <ChevronRight size={14} className={`transition-transform ${analystOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {analystOpen && (
            <div className="space-y-3">
              {projectGaps.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3">
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-400">{cap.analyst.noGaps}</p>
                </div>
              ) : (
                projectGaps.map(({ prop, gap, months }) => {
                  // Best collateral suggestion: largest FV at delivery
                  const suggestions = unallocatedCollateral.map((src) => ({
                    src,
                    fv: futureValue(src.current_balance, src.estimated_yield, months),
                  })).sort((a, b) => b.fv - a.fv)

                  const best = suggestions[0]

                  return (
                    <div
                      key={prop.id}
                      className="rounded-xl border border-red-500/20 bg-red-500/8 p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <AlertTriangle size={12} className="shrink-0 text-red-400" />
                        <span className="text-xs font-semibold text-red-400">{cap.analyst.gapFor}</span>
                        <span className="text-xs font-medium text-[#F0EDE8]">{prop.name}</span>
                        <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          {cap.analyst.gapAmount} {fmtILS(gap)}{cap.analyst.perMonth}
                        </span>
                      </div>

                      {best ? (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 p-2.5">
                          <Zap size={11} className="mt-0.5 shrink-0 text-amber-400" />
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                              {cap.analyst.suggestionTitle}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-[#86968B]">
                              {cap.analyst.collateralSuggest(best.src.name, fmtILS(best.fv))}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-lg border border-[#2C3B38] bg-[#101A26]/50 p-2.5">
                          <ShieldOff size={11} className="mt-0.5 shrink-0 text-[#445147]" />
                          <p className="text-xs text-[#445147]">{cap.analyst.noCollateral}</p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Liquidity Timeline Chart ── */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
        <LiquidityChart sources={chartSources} />
      </div>

      {/* ── Sources Grid ── */}
      {initial.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B38] bg-[#172530]/50 py-20 text-center">
          <Coins size={36} className="mb-4 text-[#445147]" />
          <p className="text-sm font-medium text-[#86968B]">{cap.emptyTitle}</p>
          <p className="mt-1 text-xs text-[#445147]">{cap.emptyHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initial.map((src) => {
            const allocProp    = src.allocated_to_property_id
              ? properties.find((p) => p.id === src.allocated_to_property_id)
              : null
            // Find the delivery date of the linked property for FV calculation
            const deliveryDate = allocProp?.target_exit_date ?? null
            const fvMonths     = Math.max(0, monthsDiff(today, deliveryDate))
            const fv           = futureValue(src.current_balance, src.estimated_yield, fvMonths)
            const yieldGain    = fv - src.current_balance
            const isLiquid     = !src.liquidity_date || new Date(src.liquidity_date) <= today

            return (
              <div key={src.id} className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5 transition-colors hover:border-[#C8AA8F]/20">

                {/* Card header */}
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
                    <button onClick={() => openEdit(src)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                {/* Values */}
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

                  {/* Future Value at delivery */}
                  {deliveryDate && fvMonths > 0 && (
                    <div className="flex justify-between rounded-lg border border-blue-500/15 bg-blue-500/8 px-2.5 py-1.5 text-xs">
                      <span className="text-[#86968B]">{cap.card.futureValue}</span>
                      <div className="text-right">
                        <span className="font-bold text-blue-400">{fmtILS(fv)}</span>
                        {yieldGain > 0 && (
                          <span className="ml-1.5 text-[10px] text-emerald-400">
                            +{fmtILS(yieldGain)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Allocation status */}
                <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${allocProp ? 'border-amber-500/20 bg-amber-500/8' : 'border-[#2C3B38] bg-[#101A26]/30'}`}>
                  {allocProp
                    ? <Lock size={11} className="shrink-0 text-amber-400" />
                    : <Unlock size={11} className="shrink-0 text-[#445147]" />
                  }
                  <p className={`truncate text-xs ${allocProp ? 'text-amber-400 font-semibold' : 'text-[#445147]'}`}>
                    {allocProp
                      ? `${cap.card.allocatedTo}${allocProp.name}`
                      : cap.card.notAllocated
                    }
                  </p>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#2C3B38] bg-[#172530] shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[#2C3B38] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#F0EDE8]">
                {editSrc ? cap.form.editTitle : cap.form.addTitle}
              </h2>
              <button onClick={() => setOpen(false)} className="text-[#86968B] hover:text-[#F0EDE8]">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">

              {fld('name', cap.form.name, 'text', cap.form.namePlaceholder)}

              {/* Source type */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{cap.form.sourceType}</label>
                <select
                  value={form.source_type}
                  onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value as SourceType }))}
                  className={baseCls}
                >
                  {SOURCE_TYPES.map((st) => (
                    <option key={st} value={st} className="bg-[#172530]">{cap.sourceTypes[st]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {fld('current_balance', cap.form.currentBalance, 'number', '0')}
                {fld('estimated_yield', cap.form.estimatedYield, 'number', '5')}
              </div>

              {fld('liquidity_date', cap.form.liquidityDate, 'date')}

              {/* Collateral toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-[#2C3B38] bg-[#101A26]/50 px-4 py-2.5">
                <input
                  id="is_collateral"
                  type="checkbox"
                  checked={form.is_collateral}
                  onChange={(e) => setForm((f) => ({ ...f, is_collateral: e.target.checked }))}
                  className="h-4 w-4 accent-[#C8AA8F] cursor-pointer"
                />
                <label htmlFor="is_collateral" className="cursor-pointer text-sm text-[#F0EDE8]">
                  {cap.form.isCollateral}
                </label>
              </div>

              {/* Allocation to property */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{cap.form.allocateTo}</label>
                <select
                  value={form.allocated_to_property_id}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm((f) => ({ ...f, allocated_to_property_id: val }))
                    checkDoubleAlloc(val, editSrc?.id ?? null)
                  }}
                  className={baseCls}
                >
                  <option value="" className="bg-[#172530]">{cap.form.allocateNone}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#172530]">{p.name}</option>
                  ))}
                </select>
              </div>

              {form.allocated_to_property_id && (
                fld('allocated_amount', cap.form.allocatedAmount, 'number', '0')
              )}

              {/* Double-allocation warning */}
              {doubleAllocPropName && (
                <AnalystAlert
                  type="double_allocation"
                  allocatedPropertyName={doubleAllocPropName}
                />
              )}

              {fld('notes', cap.form.notes)}

              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

              <div className={`flex gap-3 pt-1 ${editSrc ? 'justify-between' : ''}`}>
                {editSrc && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20"
                  >
                    <Trash2 size={14} />{cap.form.delete}
                  </button>
                )}
                <div className={`flex gap-3 ${editSrc ? '' : 'flex-1'}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm font-medium text-[#86968B] transition-colors hover:text-[#F0EDE8]"
                  >
                    {cap.form.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !!doubleAllocPropName}
                    className="flex-1 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50 disabled:opacity-50"
                  >
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
