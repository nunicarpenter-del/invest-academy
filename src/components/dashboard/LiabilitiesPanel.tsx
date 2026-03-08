'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import AllocationChart, { type AllocationItem } from './AllocationChart'

export interface Liability {
  id:                string
  name:              string
  lender:            string | null
  total_amount:      number
  monthly_repayment: number
  interest_rate:     number | null
  end_date:          string | null
  notes:             string | null
}

interface Props {
  initialLiabilities: Liability[]
  userId: string
}

// Colour palette for liabilities (reds/oranges)
const COLORS = [
  '#EF4444', '#F97316', '#FBBF24', '#EC4899',
  '#8B5CF6', '#06B6D4', '#10B981', '#6366F1',
]

const fmt = (n: number) =>
  '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })

function remainingLabel(
  endDate: string | null,
  r: { expired: string; years: (y: number) => string; months: (m: number) => string; yearsMonths: (y: number, m: number) => string; noDate: string }
): string {
  if (!endDate) return r.noDate
  const months = Math.round(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)
  )
  if (months <= 0) return r.expired
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0)      return r.months(m)
  if (m === 0)      return r.years(y)
  return r.yearsMonths(y, m)
}

const BLANK = {
  name: '', lender: '', total_amount: '', monthly_repayment: '',
  interest_rate: '', end_date: '', notes: '',
}

export default function LiabilitiesPanel({ initialLiabilities, userId }: Props) {
  const router   = useRouter()
  const { t }    = useLang()
  const lb       = t.dashboard.liabilities
  const supabase = createClient()

  const [items,     setItems]     = useState<Liability[]>(initialLiabilities)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<Liability | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState(BLANK)

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData: AllocationItem[] = items.map((item, i) => ({
    name:  item.lender ? `${item.name} · ${item.lender}` : item.name,
    value: item.total_amount,
    color: COLORS[i % COLORS.length],
  }))
  const chartTotal = items.reduce((s, l) => s + l.total_amount, 0)

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openAdd() {
    setEditing(null)
    setForm(BLANK)
    setShowModal(true)
  }

  function openEdit(item: Liability) {
    setEditing(item)
    setForm({
      name:              item.name,
      lender:            item.lender ?? '',
      total_amount:      String(item.total_amount),
      monthly_repayment: String(item.monthly_repayment),
      interest_rate:     item.interest_rate != null ? String(item.interest_rate) : '',
      end_date:          item.end_date ?? '',
      notes:             item.notes ?? '',
    })
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null) }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      user_id:           userId,
      name:              form.name.trim(),
      lender:            form.lender.trim() || null,
      total_amount:      parseFloat(form.total_amount)      || 0,
      monthly_repayment: parseFloat(form.monthly_repayment) || 0,
      interest_rate:     form.interest_rate ? parseFloat(form.interest_rate) : null,
      end_date:          form.end_date || null,
      notes:             form.notes.trim() || null,
      updated_at:        new Date().toISOString(),
    }

    if (editing) {
      const { data } = await supabase
        .from('liabilities')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (data) setItems(prev => prev.map(l => l.id === editing.id ? data as Liability : l))
    } else {
      const { data } = await supabase
        .from('liabilities')
        .insert(payload)
        .select()
        .single()
      if (data) setItems(prev => [...prev, data as Liability])
    }

    setSaving(false)
    closeModal()
    router.refresh()
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    await supabase.from('liabilities').delete().eq('id', editing.id)
    setItems(prev => prev.filter(l => l.id !== editing.id))
    setSaving(false)
    closeModal()
    router.refresh()
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F0EDE8]">{lb.title}</h3>
          <p className="text-xs text-[#86968B]">{lb.distributionSubtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
        >
          <Plus size={13} />
          {lb.addButton}
        </button>
      </div>

      {/* ── Chart ── */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#20302F] p-6">
        <div className="mb-4">
          <p className="text-sm font-semibold text-[#F0EDE8]">{lb.distributionTitle}</p>
          <p className="text-xs text-[#86968B]">{lb.distributionSubtitle}</p>
        </div>
        <AllocationChart
          data={chartData}
          total={chartTotal}
          emptyLabel={lb.emptyChart}
          totalLabel={lb.totalLabel}
          accentColor="#EF4444"
        />
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#20302F] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2C3B38]">
              {[lb.table.name, lb.table.lender, lb.table.total, lb.table.monthly, lb.table.interest, lb.table.remaining].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#445147]">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#445147]">
                  <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                  {lb.emptyTable}
                </td>
              </tr>
            ) : items.map((item, i) => (
              <tr
                key={item.id}
                className="border-b border-[#2C3B38]/60 transition hover:bg-[#263A37]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium text-[#F0EDE8]">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#86968B]">{item.lender ?? '—'}</td>
                <td className="px-4 py-3 font-semibold text-red-400">{fmt(item.total_amount)}</td>
                <td className="px-4 py-3 text-[#F0EDE8]">{fmt(item.monthly_repayment)}</td>
                <td className="px-4 py-3 text-[#86968B]">
                  {item.interest_rate != null ? `${item.interest_rate}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    !item.end_date
                      ? 'bg-[#2C3B38] text-[#445147]'
                      : new Date(item.end_date) < new Date()
                        ? 'bg-red-400/10 text-red-400'
                        : 'bg-[#2C3B38] text-[#86968B]'
                  }`}>
                    {remainingLabel(item.end_date, t.dashboard.liabilities.remaining)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-1.5 text-[#445147] transition hover:bg-[#2C3B38] hover:text-[#C8AA8F]"
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t border-[#2C3B38]">
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#445147]">
                  {lb.totalLabel}
                </td>
                <td className="px-4 py-3 font-bold text-red-400">
                  {fmt(items.reduce((s, l) => s + l.total_amount, 0))}
                </td>
                <td className="px-4 py-3 font-bold text-[#F0EDE8]">
                  {fmt(items.reduce((s, l) => s + l.monthly_repayment, 0))}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3B38] bg-[#1A2B29] p-6 shadow-2xl">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F0EDE8]">
                {editing ? lb.form.editTitle : lb.form.addTitle}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-[#445147] hover:text-[#F0EDE8]">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#86968B]">{lb.form.name}</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={lb.form.namePh}
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-red-400/50"
                />
              </div>

              {/* Lender */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#86968B]">{lb.form.lender}</label>
                <input
                  value={form.lender}
                  onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
                  placeholder={lb.form.lenderPh}
                  className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-red-400/50"
                />
              </div>

              {/* Total amount + Monthly */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#86968B]">{lb.form.totalAmount}</label>
                  <input
                    type="number" min="0"
                    value={form.total_amount}
                    onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-red-400/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#86968B]">{lb.form.monthly}</label>
                  <input
                    type="number" min="0"
                    value={form.monthly_repayment}
                    onChange={e => setForm(f => ({ ...f, monthly_repayment: e.target.value }))}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-red-400/50"
                  />
                </div>
              </div>

              {/* Interest + End date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#86968B]">{lb.form.interest}</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={form.interest_rate}
                    onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-red-400/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#86968B]">{lb.form.endDate}</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-red-400/50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#86968B]">{lb.form.notes}</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-[#2C3B38] bg-[#20302F] px-3 py-2 text-sm text-[#F0EDE8] outline-none focus:border-red-400/50"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-5 flex items-center justify-between gap-3">
              {editing && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-400/10"
                >
                  <Trash2 size={13} />
                  {lb.form.delete}
                </button>
              )}
              <div className="ms-auto flex gap-3">
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-[#2C3B38] px-4 py-2 text-xs font-semibold text-[#86968B] transition hover:border-[#445147] hover:text-[#F0EDE8]"
                >
                  {lb.form.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
                >
                  {saving ? lb.form.saving : lb.form.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
