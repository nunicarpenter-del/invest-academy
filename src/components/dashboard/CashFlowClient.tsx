'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil, X, TrendingUp, TrendingDown, Minus,
  Home, DollarSign, CreditCard, Wrench, Plus,
  ReceiptText, Calendar, ChevronDown, Trash2,
  CheckCircle2, AlertTriangle, AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import dynamic from 'next/dynamic'

const CashFlowGantt    = dynamic(() => import('./CashFlowGantt'),    { ssr: false })
const CashFlowForecast = dynamic(() => import('./CashFlowForecast'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────
interface PropertyCF {
  id: string
  name: string
  monthly_rent: number | null
  mortgage_monthly_payment: number | null
  other_expenses: number | null
}

interface Transaction {
  id: string
  property_id: string | null
  transaction_type: 'fixed' | 'variable'
  flow_type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  notes: string | null
  bank_account: string | null
}

interface ProjectProperty {
  id: string
  name: string
  completion_amount: number | null
  delivery_equity: number | null
  target_exit_date: string | null
  completion_funding_source: string | null
}

interface Props {
  properties: PropertyCF[]
  transactions: Transaction[]
  projectProperties: ProjectProperty[]
  hasCashFlowIncome: boolean
  hasCashFlowExpenses: boolean
}

// ── Category lists ─────────────────────────────────────────────────────────
const FIXED_EXPENSE_CATS    = ['mortgage', 'insurance', 'management', 'taxes', 'subscription', 'education', 'internet_tv']
const VARIABLE_EXPENSE_CATS = ['maintenance', 'legal', 'marketing', 'groceries', 'leisure', 'fuel_transport', 'health']
const INCOME_CATS           = ['salary', 'allowance', 'rent', 'dividends', 'other']

// ── Helpers ────────────────────────────────────────────────────────────────
const n = (v: number | null) => v ?? 0

const netCF = (p: PropertyCF) =>
  n(p.monthly_rent) - n(p.mortgage_monthly_payment) - n(p.other_expenses)

const fmt = (v: number, signed = false) => {
  const abs = '₪' + Math.abs(v).toLocaleString('he-IL', { maximumFractionDigits: 0 })
  if (!signed) return abs
  return v >= 0 ? `+${abs}` : `-${abs}`
}

const cfColor = (v: number) =>
  v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-[#86968B]'

const cfBg = (v: number) =>
  v > 0 ? 'bg-emerald-400/10' : v < 0 ? 'bg-red-400/10' : 'bg-[#2C3B38]/40'

const fmtDate = (dateStr: string, lang: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString(
    lang === 'he' ? 'he-IL' : 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  )

// Badge styling per flow type + transaction type
const typeBadgeCls = (tx: Transaction) => {
  if (tx.flow_type === 'income') {
    return tx.transaction_type === 'fixed'
      ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
      : 'bg-teal-400/10 text-teal-400 border-teal-400/20'
  }
  return tx.transaction_type === 'fixed'
    ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
    : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
}

// ── Month diff helper ──────────────────────────────────────────────────────
function monthsDiff(from: Date, toDateStr: string | null): number {
  if (!toDateStr) return 0
  const to = new Date(toDateStr)
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

// ── Analyst Panel ──────────────────────────────────────────────────────────
function AnalystPanel({
  surplus,
  hasCashFlowIncome,
  hasCashFlowExpenses,
  projectProperties,
  onAddIncome,
  onAddExpense,
}: {
  surplus: number
  hasCashFlowIncome: boolean
  hasCashFlowExpenses: boolean
  projectProperties: ProjectProperty[]
  onAddIncome: () => void
  onAddExpense: () => void
}) {
  const { t } = useLang()
  const a = t.cashflow.analyst
  const isDataComplete = hasCashFlowIncome && hasCashFlowExpenses

  // Per-project validation
  const today = new Date()
  const validations = projectProperties.map((prop) => {
    const completionAmt = prop.completion_amount ?? prop.delivery_equity ?? 0
    const months        = monthsDiff(today, prop.target_exit_date)
    const required      = months > 0 ? completionAmt / months : completionAmt
    const gap           = required - surplus
    const ok            = surplus >= required
    return { id: prop.id, name: prop.name, required, gap, ok, months }
  })

  const showPanel = !isDataComplete || validations.length > 0

  if (!showPanel) return null

  return (
    <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">

      {/* Header: AI avatar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8AA8F]/30 bg-[#C8AA8F]/15">
          <span className="text-xs font-bold text-[#C8AA8F]">AI</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#C8AA8F]">{a.title}</p>
          <p className="text-xs text-[#86968B]">{a.subtitle}</p>
        </div>
      </div>

      {/* ── Data completeness check ── */}
      <div className="mb-4">
        <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#445147]">{a.completenessTitle}</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Income check */}
          <div className={`flex items-center gap-2 rounded-xl border p-2.5 ${hasCashFlowIncome ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-red-500/25 bg-red-500/8'}`}>
            {hasCashFlowIncome
              ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
              : <AlertTriangle size={13} className="shrink-0 text-red-400" />
            }
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${hasCashFlowIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                {hasCashFlowIncome ? a.incomeOk : a.incomeMissing}
              </p>
              {!hasCashFlowIncome && (
                <button onClick={onAddIncome} className="mt-0.5 text-[10px] text-blue-400 underline transition-colors hover:text-blue-300">
                  {a.addIncome}
                </button>
              )}
            </div>
          </div>

          {/* Expenses check */}
          <div className={`flex items-center gap-2 rounded-xl border p-2.5 ${hasCashFlowExpenses ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-red-500/25 bg-red-500/8'}`}>
            {hasCashFlowExpenses
              ? <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
              : <AlertTriangle size={13} className="shrink-0 text-red-400" />
            }
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${hasCashFlowExpenses ? 'text-emerald-400' : 'text-red-400'}`}>
                {hasCashFlowExpenses ? a.expenseOk : a.expenseMissing}
              </p>
              {!hasCashFlowExpenses && (
                <button onClick={onAddExpense} className="mt-0.5 text-[10px] text-blue-400 underline transition-colors hover:text-blue-300">
                  {a.addExpense}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Missing data message ── */}
      {!isDataComplete && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/8 p-3">
          <AlertCircle size={12} className="mt-0.5 shrink-0 text-blue-400" />
          <p className="text-xs leading-relaxed text-[#86968B]">{a.missingData}</p>
        </div>
      )}

      {/* ── Per-project investment validation ── */}
      {isDataComplete && validations.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-widest text-[#445147]">{a.validationTitle}</p>
          <p className="mb-3 text-xs text-[#86968B]">{a.validationSub}</p>
          <div className="space-y-2">
            {validations.map((v) => (
              <div
                key={v.id}
                className={`rounded-xl border p-3 ${v.ok ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-red-500/25 bg-red-500/8'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#F0EDE8]">{v.name}</p>
                  {v.months > 0 && (
                    <span className="text-[10px] text-[#445147]">
                      {a.deliveryIn} {v.months} {a.months}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#101A26]/60 px-2.5 py-1.5">
                    <p className="text-[10px] text-[#445147]">{a.required}</p>
                    <p className="mt-0.5 text-xs font-bold text-[#C8AA8F]">
                      {'₪' + Math.round(v.required).toLocaleString('he-IL')} {a.perMonth}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#101A26]/60 px-2.5 py-1.5">
                    <p className="text-[10px] text-[#445147]">{a.surplus}</p>
                    <p className={`mt-0.5 text-xs font-bold ${surplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {'₪' + Math.abs(surplus).toLocaleString('he-IL')}
                    </p>
                  </div>
                </div>
                <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${v.ok ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {v.ok
                    ? <CheckCircle2 size={11} className="shrink-0 text-emerald-400" />
                    : <AlertTriangle size={11} className="shrink-0 text-red-400" />
                  }
                  <p className={`text-xs font-semibold ${v.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {v.ok
                      ? a.surplusOk
                      : `${a.gapLabel}: ₪${Math.round(v.gap).toLocaleString('he-IL')} ${a.perMonth}`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All clear (data complete, no projects) ── */}
      {isDataComplete && validations.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3">
          <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-400">{a.allClear}</p>
        </div>
      )}
    </div>
  )
}

// ── Summary bar ────────────────────────────────────────────────────────────
function SummaryBar({
  properties,
  transactions,
}: {
  properties: PropertyCF[]
  transactions: Transaction[]
}) {
  const { t }  = useLang()
  const cf     = t.cashflow

  const propIncome   = properties.reduce((s, p) => s + n(p.monthly_rent), 0)
  const propExpenses = properties.reduce((s, p) => s + n(p.mortgage_monthly_payment) + n(p.other_expenses), 0)
  const txIncome     = transactions.filter((tx) => tx.flow_type === 'income').reduce((s, tx) => s + tx.amount, 0)
  const txExpenses   = transactions.filter((tx) => tx.flow_type === 'expense').reduce((s, tx) => s + tx.amount, 0)

  const totalIncome   = propIncome   + txIncome
  const totalExpenses = propExpenses + txExpenses
  const totalNet      = totalIncome  - totalExpenses

  const items = [
    { label: cf.summary.income,   value: fmt(totalIncome),    color: 'text-emerald-400', icon: TrendingUp   },
    { label: cf.summary.expenses, value: fmt(totalExpenses),  color: 'text-red-400',     icon: TrendingDown },
    { label: cf.summary.net,      value: fmt(totalNet, true), color: cfColor(totalNet),  icon: Minus        },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ label, value, color, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-4 rounded-2xl border border-[#2C3B38] bg-[#172530] px-5 py-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C8AA8F]/8 border border-[#C8AA8F]/15">
            <Icon size={18} className={color} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#445147]">{label}</p>
            <p className={`mt-0.5 text-xl font-bold tracking-tight ${color}`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Add Transaction / Income Modal ─────────────────────────────────────────
function AddTxModal({
  properties,
  flowType,
  onClose,
}: {
  properties: PropertyCF[]
  flowType: 'income' | 'expense'
  onClose: () => void
}) {
  const router = useRouter()
  const { t }  = useLang()
  const cf     = t.cashflow
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [txType, setTxType] = useState<'fixed' | 'variable'>('fixed')
  const [form, setForm]     = useState({
    category:     flowType === 'income' ? 'salary' : 'mortgage',
    amount:       '',
    date:         new Date().toISOString().slice(0, 10),
    property_id:  '',
    notes:        '',
    bank_account: '',
  })

  const isIncome = flowType === 'income'

  const cats = isIncome
    ? INCOME_CATS
    : txType === 'fixed' ? FIXED_EXPENSE_CATS : VARIABLE_EXPENSE_CATS

  const switchType = (type: 'fixed' | 'variable') => {
    setTxType(type)
    if (!isIncome) {
      const newCats = type === 'fixed' ? FIXED_EXPENSE_CATS : VARIABLE_EXPENSE_CATS
      setForm((f) => ({ ...f, category: newCats[0] }))
    }
  }

  // Accent colours
  const accent = isIncome
    ? {
        toggleActive: 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30',
        btn:          'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 hover:border-emerald-400/50',
        badge:        'border-emerald-400/20 bg-emerald-400/8 text-emerald-400',
      }
    : {
        toggleActive: 'bg-[#C8AA8F]/15 text-[#C8AA8F] border border-[#C8AA8F]/30',
        btn:          'border-[#C8AA8F]/30 bg-[#C8AA8F]/10 text-[#C8AA8F] hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50',
        badge:        'border-[#C8AA8F]/20 bg-[#C8AA8F]/8 text-[#C8AA8F]',
      }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError(cf.txForm.notAuth); return }

    const { error: err } = await supabase.from('cash_flow_transactions').insert({
      user_id:          user.id,
      property_id:      form.property_id || null,
      flow_type:        flowType,
      transaction_type: txType,
      category:         form.category,
      amount:           parseFloat(form.amount),
      date:             form.date,
      notes:            form.notes.trim() || null,
      bank_account:     form.bank_account.trim() || null,
    })

    if (err) { setError(err.message); return }
    onClose()
    startTransition(() => router.refresh())
  }

  const baseCls  = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-4 pl-10 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-colors focus:border-[#C8AA8F]/50 focus:ring-1 focus:ring-[#C8AA8F]/20'
  const selCls   = 'w-full appearance-none rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-8 pl-10 text-sm text-[#F0EDE8] outline-none cursor-pointer transition-colors focus:border-[#C8AA8F]/50'

  const iconWrap = (icon: React.ReactNode, child: React.ReactNode) => (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">
        {icon}
      </span>
      {child}
    </div>
  )

  const title = isIncome ? cf.addIncomeButton : cf.addTxButton
  const typeLabel = isIncome ? cf.txForm.incomeTypeLabel : cf.txForm.expenseTypeLabel
  const typeMap   = isIncome ? cf.txIncomeTypes : cf.txExpenseTypes
  const catMap    = isIncome ? cf.txIncomeCategories : cf.txCategories

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-[#2C3B38] bg-[#172530] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold tracking-wide ${accent.badge}`}>
              {isIncome ? '▲' : '▼'}
            </span>
            <h2 className="text-base font-semibold text-[#F0EDE8]">{title}</h2>
          </div>
          <button onClick={onClose} className="text-[#86968B] transition-colors hover:text-[#F0EDE8]">
            <X size={18} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold tracking-widest text-[#86968B]">{typeLabel}</p>
          <div className="flex rounded-xl border border-[#2C3B38] bg-[#101A26] p-1">
            {(['fixed', 'variable'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => switchType(type)}
                className={`
                  flex-1 rounded-lg py-2 text-xs font-semibold transition-all
                  ${txType === type ? accent.toggleActive : 'text-[#86968B] hover:text-[#F0EDE8]'}
                `}
              >
                {typeMap[type]}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">
              {cf.txForm.category}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">
                <ReceiptText size={14} />
              </span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={selCls}
              >
                {cats.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#172530]">
                    {catMap[cat] ?? cat}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#445147]">
                <ChevronDown size={13} />
              </span>
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">
                {cf.txForm.amount}
              </label>
              {iconWrap(
                <DollarSign size={14} />,
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={baseCls}
                />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">
                {cf.txForm.date}
              </label>
              {iconWrap(
                <Calendar size={14} />,
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={baseCls}
                />
              )}
            </div>
          </div>

          {/* Property */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">
              {cf.txForm.property}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">
                <Home size={14} />
              </span>
              <select
                value={form.property_id}
                onChange={(e) => setForm((f) => ({ ...f, property_id: e.target.value }))}
                className={selCls}
              >
                <option value="" className="bg-[#172530]">{cf.txForm.propertyNone}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#172530]">{p.name}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#445147]">
                <ChevronDown size={13} />
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">
              {cf.txForm.notes}
            </label>
            {iconWrap(
              <ReceiptText size={14} />,
              <input
                type="text"
                placeholder={cf.txForm.notesPlaceholder}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={baseCls}
              />
            )}
          </div>

          {/* Bank Account */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">
              {cf.txForm.bankAccount}
            </label>
            {iconWrap(
              <CreditCard size={14} />,
              <input
                type="text"
                placeholder={cf.txForm.bankAccount}
                value={form.bank_account}
                onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))}
                dir="auto"
                className={baseCls}
              />
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm font-medium text-[#86968B] transition-colors hover:text-[#F0EDE8]"
            >
              {cf.txForm.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${accent.btn}`}
            >
              {isPending ? cf.txForm.saving : cf.txForm.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CashFlowClient({
  properties: initial,
  transactions,
  projectProperties,
  hasCashFlowIncome,
  hasCashFlowExpenses,
}: Props) {
  const router = useRouter()
  const { lang, t } = useLang()
  const cf = t.cashflow
  const [isPending, startTransition] = useTransition()
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [modalFlowType, setModalFlowType] = useState<'income' | 'expense' | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  // Month / year filter
  const now = new Date()
  const [filterYear,  setFilterYear]  = useState<number>(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth())   // 0-indexed

  // Gantt active month (null = all)
  const [ganttMonth, setGanttMonth] = useState<number | null>(null)
  const [showGantt,  setShowGantt]  = useState(true)
  const [showForecast, setShowForecast] = useState(false)

  // Bank account filter
  const [bankFilter, setBankFilter] = useState<string>('')

  // Derive min/max year from existing transactions
  const txYears = transactions.length > 0
    ? [...new Set(transactions.map((tx) => new Date(tx.date).getFullYear()))].sort()
    : [now.getFullYear()]
  const minYear = Math.min(...txYears, now.getFullYear())
  const maxYear = Math.max(...txYears, now.getFullYear())

  // Filtered transactions (month + optional bank account)
  const filteredTxs = transactions.filter((tx) => {
    const d = new Date(tx.date + 'T00:00:00')
    const matchMonth = d.getFullYear() === filterYear && d.getMonth() === filterMonth
    const matchBank  = !bankFilter || tx.bank_account === bankFilter
    return matchMonth && matchBank
  })

  // Gantt click: jump to that month
  const handleGanttClick = (month: number) => {
    setFilterMonth(month)
    setFilterYear(now.getFullYear())
    setGanttMonth(prev => prev === month ? null : month)
  }

  // Unique bank accounts for filter dropdown
  const uniqueBankAccounts = [...new Set(
    transactions.map((tx) => tx.bank_account).filter(Boolean) as string[]
  )]

  const [form, setForm] = useState({
    monthly_rent:             '',
    mortgage_monthly_payment: '',
    other_expenses:           '',
  })

  const editing = initial.find((p) => p.id === editingId) ?? null

  const openEdit = (p: PropertyCF) => {
    setError(null)
    setForm({
      monthly_rent:             p.monthly_rent             != null ? String(p.monthly_rent)             : '',
      mortgage_monthly_payment: p.mortgage_monthly_payment != null ? String(p.mortgage_monthly_payment) : '',
      other_expenses:           p.other_expenses           != null ? String(p.other_expenses)           : '',
    })
    setEditingId(p.id)
  }

  const closeEdit = () => { setEditingId(null); setError(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        monthly_rent:             form.monthly_rent             ? parseFloat(form.monthly_rent)             : null,
        mortgage_monthly_payment: form.mortgage_monthly_payment ? parseFloat(form.mortgage_monthly_payment) : null,
        other_expenses:           form.other_expenses           ? parseFloat(form.other_expenses)           : null,
      })
      .eq('id', editingId)
    if (updateError) { setError(updateError.message); return }
    closeEdit()
    startTransition(() => router.refresh())
  }

  const handleDeleteTx = async (txId: string) => {
    const supabase = createClient()
    await supabase.from('cash_flow_transactions').delete().eq('id', txId)
    startTransition(() => router.refresh())
  }

  const numInput = (
    id: keyof typeof form,
    label: string,
    icon: React.ReactNode,
  ) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">
          {icon}
        </span>
        <input
          id={id}
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          className="
            w-full rounded-xl border border-[#2C3B38] bg-[#101A26]
            py-2.5 pr-4 pl-10 text-sm text-[#F0EDE8] placeholder-[#445147]
            outline-none transition-colors
            focus:border-[#C8AA8F]/50 focus:ring-1 focus:ring-[#C8AA8F]/20
          "
        />
      </div>
    </div>
  )

  // Totals
  const totalRent     = initial.reduce((s, p) => s + n(p.monthly_rent), 0)
  const totalMortgage = initial.reduce((s, p) => s + n(p.mortgage_monthly_payment), 0)
  const totalOther    = initial.reduce((s, p) => s + n(p.other_expenses), 0)
  const totalNet      = totalRent - totalMortgage - totalOther

  const incomeTxs  = filteredTxs.filter((tx) => tx.flow_type === 'income')
  const expenseTxs = filteredTxs.filter((tx) => tx.flow_type === 'expense')
  const incomeTxTotal  = incomeTxs.reduce((s, tx) => s + tx.amount, 0)
  const expenseTxTotal = expenseTxs.reduce((s, tx) => s + tx.amount, 0)

  // Monthly surplus for Analyst Panel:
  // property baselines (recurring) + current-month filtered transactions = most accurate monthly figure
  const propIncome     = initial.reduce((s, p) => s + n(p.monthly_rent), 0)
  const propExpenses   = initial.reduce((s, p) => s + n(p.mortgage_monthly_payment) + n(p.other_expenses), 0)
  const monthlyIncome   = propIncome   + incomeTxTotal
  const monthlyExpenses = propExpenses + expenseTxTotal
  const monthlySurplus  = monthlyIncome - monthlyExpenses

  // Month picker helpers
  const MONTHS = lang === 'he'
    ? ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const canPrev = filterYear > minYear || filterMonth > 0
  const canNext = filterYear < maxYear || filterMonth < 11

  const prevMonth = () => {
    if (filterMonth === 0) { setFilterYear((y) => y - 1); setFilterMonth(11) }
    else setFilterMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (filterMonth === 11) { setFilterYear((y) => y + 1); setFilterMonth(0) }
    else setFilterMonth((m) => m + 1)
  }

  const TABLE_HEADERS = [cf.table.property, cf.table.rent, cf.table.mortgage, cf.table.other, cf.table.net, '']

  return (
    <div className="space-y-8 p-6 lg:p-10">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{cf.section}</p>
          <h1 className="text-2xl font-semibold text-[#F0EDE8]">{cf.title}</h1>
          <p className="mt-1 text-sm text-[#86968B]">{cf.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Income — green */}
          <button
            onClick={() => setModalFlowType('income')}
            className="
              flex items-center gap-2 rounded-xl border border-emerald-500/30
              bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400
              transition-all duration-150 hover:bg-emerald-500/20 hover:border-emerald-500/50
            "
          >
            <Plus size={16} />
            {cf.addIncomeButton}
          </button>

          {/* Add Expense — gold */}
          <button
            onClick={() => setModalFlowType('expense')}
            className="
              flex items-center gap-2 rounded-xl border border-[#C8AA8F]/30
              bg-[#C8AA8F]/10 px-4 py-2.5 text-sm font-semibold text-[#C8AA8F]
              transition-all duration-150 hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50
            "
          >
            <Plus size={16} />
            {cf.addTxButton}
          </button>
        </div>
      </div>

      {/* ── Month / Year picker ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          disabled={!canPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2C3B38] text-[#86968B] transition-colors hover:text-[#F0EDE8] disabled:opacity-30"
        >
          ‹
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-[#2C3B38] bg-[#172530] px-4 py-2">
          <Calendar size={14} className="text-[#C8AA8F]" />
          <span className="min-w-[120px] text-center text-sm font-semibold text-[#F0EDE8]">
            {MONTHS[filterMonth]} {filterYear}
          </span>
        </div>
        <button
          onClick={nextMonth}
          disabled={!canNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2C3B38] text-[#86968B] transition-colors hover:text-[#F0EDE8] disabled:opacity-30"
        >
          ›
        </button>
        <span className="text-xs text-[#86968B]">
          {filteredTxs.length} {lang === 'he' ? 'תנועות' : 'transactions'}
        </span>
      </div>

      {/* ── Summary ── */}
      <SummaryBar properties={initial} transactions={filteredTxs} />

      {/* ── Annual Gantt ── */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#172530]">
        <button
          onClick={() => setShowGantt((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="text-right">
            <p className="text-sm font-semibold text-[#F0EDE8]">{cf.gantt.title}</p>
            <p className="text-xs text-[#86968B]">{cf.gantt.subtitle}</p>
          </div>
          <ChevronDown size={16} className={`text-[#86968B] transition-transform ${showGantt ? 'rotate-180' : ''}`} />
        </button>
        {showGantt && (
          <div className="border-t border-[#2C3B38] px-4 pb-4 pt-2">
            {ganttMonth !== null && (
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-[#86968B]">
                  {lang === 'he' ? `מסנן: ${MONTHS[ganttMonth]}` : `Filtering: ${MONTHS[ganttMonth]}`}
                </p>
                <button
                  onClick={() => setGanttMonth(null)}
                  className="text-xs text-[#C8AA8F] underline"
                >
                  {cf.gantt.viewAll}
                </button>
              </div>
            )}
            <CashFlowGantt
              transactions={transactions}
              properties={initial}
              activeMonth={ganttMonth}
              onMonthClick={handleGanttClick}
            />
          </div>
        )}
      </div>

      {/* ── 12-Month Forecast ── */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#172530]">
        <button
          onClick={() => setShowForecast((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="text-right">
            <p className="text-sm font-semibold text-[#F0EDE8]">{cf.forecast.title}</p>
            <p className="text-xs text-[#86968B]">{cf.forecast.subtitle}</p>
          </div>
          <ChevronDown size={16} className={`text-[#86968B] transition-transform ${showForecast ? 'rotate-180' : ''}`} />
        </button>
        {showForecast && (
          <div className="border-t border-[#2C3B38] px-4 pb-4 pt-2">
            <CashFlowForecast transactions={transactions} properties={initial} />
          </div>
        )}
      </div>

      {/* ── Analyst Panel ── */}
      <AnalystPanel
        surplus={monthlySurplus}
        hasCashFlowIncome={hasCashFlowIncome}
        hasCashFlowExpenses={hasCashFlowExpenses}
        projectProperties={projectProperties}
        onAddIncome={() => setModalFlowType('income')}
        onAddExpense={() => setModalFlowType('expense')}
      />

      {/* ── Property table ── */}
      {initial.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B38] bg-[#172530]/50 py-20 text-center">
          <Home size={36} className="mb-4 text-[#445147]" />
          <p className="text-sm font-medium text-[#86968B]">{cf.emptyTitle}</p>
          <p className="mt-1 text-xs text-[#445147]">{cf.emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#2C3B38]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2C3B38] bg-[#172530]">
                  {TABLE_HEADERS.map((h, i) => (
                    <th
                      key={i}
                      className="px-5 py-3.5 text-right text-xs font-semibold tracking-widest text-[#445147]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#2C3B38] bg-[#101A26]">
                {initial.map((p) => {
                  const net = netCF(p)
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-[#172530]/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#C8AA8F]/15 bg-[#C8AA8F]/8">
                            <Home size={14} className="text-[#C8AA8F]" />
                          </div>
                          <span dir="auto" className="font-medium text-[#F0EDE8]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-emerald-400">
                          {p.monthly_rent != null ? fmt(p.monthly_rent) : <span className="text-[#445147]">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-[#F0EDE8]">
                          {p.mortgage_monthly_payment != null ? fmt(p.mortgage_monthly_payment) : <span className="text-[#445147]">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-[#F0EDE8]">
                          {p.other_expenses != null ? fmt(p.other_expenses) : <span className="text-[#445147]">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfColor(net)} ${cfBg(net)}`}>
                          {net >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {fmt(net, true)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEdit(p)}
                          className="
                            flex items-center gap-1.5 rounded-xl border border-[#C8AA8F]/25
                            bg-[#C8AA8F]/8 px-3 py-1.5 text-xs font-semibold text-[#C8AA8F]
                            transition-all hover:bg-[#C8AA8F]/18 hover:border-[#C8AA8F]/45
                          "
                        >
                          <Pencil size={11} />{cf.edit.button}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-[#2C3B38] bg-[#172530]">
                  <td className="px-5 py-4 text-xs font-bold tracking-widest text-[#86968B]">{cf.table.total}</td>
                  <td className="px-5 py-4 font-bold text-emerald-400">{fmt(totalRent)}</td>
                  <td className="px-5 py-4 font-bold text-[#F0EDE8]">{fmt(totalMortgage)}</td>
                  <td className="px-5 py-4 font-bold text-[#F0EDE8]">{fmt(totalOther)}</td>
                  <td className="px-5 py-4" colSpan={2}>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${cfColor(totalNet)} ${cfBg(totalNet)}`}>
                      {totalNet >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {fmt(totalNet, true)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Transactions section ── */}
      <div>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#F0EDE8]">{cf.txSection}</h2>
            <p className="mt-0.5 text-sm text-[#86968B]">{cf.txSectionSub}</p>
          </div>
          {/* Bank account filter */}
          {uniqueBankAccounts.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#86968B]">{cf.bankFilter.label}:</label>
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="rounded-xl border border-[#2C3B38] bg-[#101A26] py-1.5 px-3 text-xs text-[#F0EDE8] outline-none focus:border-[#C8AA8F]/50"
              >
                <option value="">{cf.bankFilter.allAccounts}</option>
                {uniqueBankAccounts.map((acc) => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredTxs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B38] bg-[#172530]/50 py-12 text-center">
            <ReceiptText size={28} className="mb-3 text-[#445147]" />
            <p className="text-sm font-medium text-[#86968B]">{cf.txEmptyTitle}</p>
            <p className="mt-1 text-xs text-[#445147]">
              {lang === 'he' ? `אין תנועות ל-${MONTHS[filterMonth]} ${filterYear}` : `No transactions for ${MONTHS[filterMonth]} ${filterYear}`}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#2C3B38]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#2C3B38] bg-[#172530]">
                    {[cf.txTable.date, cf.txTable.property, cf.txTable.type, cf.txTable.category, cf.txTable.amount, ''].map((h, i) => (
                      <th key={i} className="px-5 py-3.5 text-right text-xs font-semibold tracking-widest text-[#445147]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#2C3B38] bg-[#101A26]">
                  {filteredTxs.map((tx) => {
                    const prop    = initial.find((p) => p.id === tx.property_id)
                    const isIncome = tx.flow_type === 'income'
                    const catLabel = isIncome
                      ? (cf.txIncomeCategories[tx.category] ?? tx.category)
                      : (cf.txCategories[tx.category] ?? tx.category)
                    const typeLabel = isIncome
                      ? (cf.txIncomeTypes[tx.transaction_type] ?? tx.transaction_type)
                      : (cf.txExpenseTypes[tx.transaction_type] ?? tx.transaction_type)

                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors hover:bg-[#172530]/70 ${isIncome ? 'bg-emerald-500/3' : ''}`}
                      >
                        {/* Date */}
                        <td className="px-5 py-4 text-sm text-[#86968B]">
                          {fmtDate(tx.date, lang)}
                        </td>

                        {/* Property */}
                        <td className="px-5 py-4">
                          {prop ? (
                            <div className="flex items-center gap-2">
                              <Home size={12} className="shrink-0 text-[#445147]" />
                              <span dir="auto" className="text-[#F0EDE8]">{prop.name}</span>
                            </div>
                          ) : (
                            <span className="text-[#445147]">—</span>
                          )}
                        </td>

                        {/* Type badge */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${typeBadgeCls(tx)}`}>
                            {typeLabel}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4 text-[#F0EDE8]">{catLabel}</td>

                        {/* Amount — green for income, red for expense */}
                        <td className="px-5 py-4">
                          <span className={`font-semibold ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isIncome ? '+' : '-'}{fmt(tx.amount)}
                          </span>
                        </td>

                        {/* Delete */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            disabled={isPending}
                            className="flex items-center justify-center rounded-lg p-1.5 text-[#445147] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Footer: income + expense totals */}
                <tfoot>
                  <tr className="border-t border-[#2C3B38] bg-[#172530]">
                    <td colSpan={4} className="px-5 py-3 text-xs font-bold tracking-widest text-emerald-400">
                      {cf.summary.income}
                    </td>
                    <td className="px-5 py-3" colSpan={2}>
                      <span className="font-bold text-emerald-400">+{fmt(incomeTxTotal)}</span>
                    </td>
                  </tr>
                  <tr className="border-t border-[#2C3B38] bg-[#172530]">
                    <td colSpan={4} className="px-5 py-3 text-xs font-bold tracking-widest text-red-400">
                      {cf.summary.expenses}
                    </td>
                    <td className="px-5 py-3" colSpan={2}>
                      <span className="font-bold text-red-400">-{fmt(expenseTxTotal)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit property finances modal ── */}
      {editingId && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative w-full max-w-md rounded-2xl border border-[#2C3B38] bg-[#172530] p-6 shadow-2xl">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#F0EDE8]">{cf.edit.title}</h2>
                <p dir="auto" className="mt-0.5 text-xs text-[#86968B]">{editing.name}</p>
              </div>
              <button onClick={closeEdit} className="text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                <X size={18} />
              </button>
            </div>

            <p className="mb-5 mt-3 rounded-xl border border-[#2C3B38] bg-[#101A26]/60 px-3 py-2 text-xs text-[#86968B]">
              {cf.edit.formula}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              {numInput('monthly_rent',             cf.edit.rent,     <DollarSign size={14} />)}
              {numInput('mortgage_monthly_payment', cf.edit.mortgage, <CreditCard size={14} />)}
              {numInput('other_expenses',           cf.edit.other,    <Wrench     size={14} />)}

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm font-medium text-[#86968B] transition-colors hover:text-[#F0EDE8]"
                >
                  {cf.edit.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="
                    flex-1 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10
                    py-2.5 text-sm font-semibold text-[#C8AA8F]
                    transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50
                    disabled:opacity-50
                  "
                >
                  {isPending ? cf.edit.saving : cf.edit.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Income / Expense modal ── */}
      {modalFlowType && (
        <AddTxModal
          properties={initial}
          flowType={modalFlowType}
          onClose={() => setModalFlowType(null)}
        />
      )}
    </div>
  )
}
