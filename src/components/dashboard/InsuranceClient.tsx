'use client'

import { useState, useMemo, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Shield, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────

type InsuranceCategory = 'life' | 'health' | 'property' | 'critical_illness' | 'loss_of_income'

interface InsurancePolicy {
  id:              string
  user_id:         string
  name:            string
  category:        InsuranceCategory
  provider:        string | null
  monthly_premium: number | null
  coverage_amount: number | null
  start_date:      string | null
  end_date:        string | null
  beneficiary:     string | null
  notes:           string | null
  is_active:       boolean
  created_at:      string
}

interface Props {
  policies:  InsurancePolicy[]
  totalDebt: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const CRITICAL_CATS: InsuranceCategory[] = ['life', 'health', 'critical_illness', 'loss_of_income']
const ALL_CATS: InsuranceCategory[] = ['life', 'health', 'property', 'critical_illness', 'loss_of_income']

const CAT_ICONS: Record<InsuranceCategory, string> = {
  life:             '💙',
  health:           '🏥',
  property:         '🏠',
  critical_illness: '⚕️',
  loss_of_income:   '🛡️',
}

// ── Resilience Score ───────────────────────────────────────────────────────

type Verdict = 'under_insured' | 'optimized' | 'over_insured'

function computeResilienceScore(
  policies:        InsurancePolicy[],
  totalDebt:       number,
  familySize:      number,
  monthlyExpenses: number,
): { score: number; verdict: Verdict; gaps: InsuranceCategory[]; duplicatePairs: number } {
  const active = policies.filter(p => p.is_active)

  // 1. Coverage breadth (max 45 pts): 10 per critical category + 5 for property
  let breadthScore = 0
  for (const cat of CRITICAL_CATS) {
    if (active.some(p => p.category === cat)) breadthScore += 10
  }
  if (active.some(p => p.category === 'property')) breadthScore += 5

  // 2. Sufficiency bonus (max 25 pts)
  let sufficiency = 0
  const lifePolicy = active.find(p => p.category === 'life')
  if (lifePolicy?.coverage_amount != null && totalDebt > 0 && lifePolicy.coverage_amount >= totalDebt) {
    sufficiency += 15
  } else if (lifePolicy?.coverage_amount != null && totalDebt === 0) {
    sufficiency += 15  // no debt = covered by definition
  }
  const loiPolicy = active.find(p => p.category === 'loss_of_income')
  if (loiPolicy?.coverage_amount != null && monthlyExpenses > 0 && loiPolicy.coverage_amount >= monthlyExpenses * 6) {
    sufficiency += 10
  }

  // 3. Family need penalty: no life insurance with family ≥ 3
  const familyPenalty = (familySize >= 3 && !active.some(p => p.category === 'life')) ? 10 : 0

  // 4. Duplicate penalty: −5 per certain duplicate pair
  let duplicatePairs = 0
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (
        active[i].category === active[j].category &&
        active[i].provider  === active[j].provider &&
        active[i].provider  !== null
      ) {
        duplicatePairs++
      }
    }
  }

  let score = breadthScore + sufficiency - familyPenalty - duplicatePairs * 5
  score = Math.max(0, Math.min(100, score))

  let verdict: Verdict
  if (score < 35) verdict = 'under_insured'
  else if (score > 80 && duplicatePairs > 1) verdict = 'over_insured'
  else verdict = 'optimized'

  const gaps = CRITICAL_CATS.filter(cat => !active.some(p => p.category === cat))

  return { score, verdict, gaps, duplicatePairs }
}

// ── SVG Gauge ─────────────────────────────────────────────────────────────

function ResilienceGauge({ score, verdict }: { score: number; verdict: Verdict }) {
  const color =
    verdict === 'under_insured' ? '#f87171'
    : verdict === 'over_insured' ? '#fbbf24'
    : '#34d399'

  const r  = 88
  const cx = 125
  const cy = 118

  // Arc from left (180°) to current angle
  const angleDeg = 180 - (score / 100) * 180
  const angleRad = (angleDeg * Math.PI) / 180
  const ex = cx + r * Math.cos(angleRad)
  const ey = cy - r * Math.sin(angleRad)
  const largeArc = score > 50 ? 1 : 0

  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const fgPath = score <= 0
    ? ''
    : score >= 100
    ? bgPath
    : `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`

  return (
    <svg viewBox="0 0 250 140" className="w-full max-w-[220px] mx-auto select-none">
      <path d={bgPath} fill="none" stroke="#2C3B38" strokeWidth={18} strokeLinecap="round" />
      {fgPath && (
        <path d={fgPath} fill="none" stroke={color} strokeWidth={18} strokeLinecap="round" />
      )}
      <text x={cx} y={cy + 8} textAnchor="middle" fill={color} fontSize={30} fontWeight="bold">
        {score}
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="#86968B" fontSize={10}>
        / 100
      </text>
    </svg>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtILS  = (n: number) => '₪' + Math.abs(Math.round(n)).toLocaleString('he-IL')
const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const EMPTY_FORM = {
  name:            '',
  category:        'life' as InsuranceCategory,
  provider:        '',
  monthly_premium: '',
  coverage_amount: '',
  start_date:      '',
  end_date:        '',
  beneficiary:     '',
  notes:           '',
  is_active:       true,
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function InsuranceClient({ policies: initialPolicies, totalDebt }: Props) {
  const { t }      = useLang()
  const router     = useRouter()
  const [, startT] = useTransition()
  const ins        = t.insurance
  const supabase   = createClient()

  // ── Local state ──────────────────────────────────────────────────────────
  const [policies, setPolicies]     = useState<InsurancePolicy[]>(initialPolicies)
  const [showForm, setShowForm]     = useState(false)
  const [editPolicy, setEditPolicy] = useState<InsurancePolicy | null>(null)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [familySize, setFamilySize] = useState(2)
  const [monthlyExp, setMonthlyExp] = useState(0)

  // ── Resilience score (live) ──────────────────────────────────────────────
  const resilience = useMemo(
    () => computeResilienceScore(policies, totalDebt, familySize, monthlyExp),
    [policies, totalDebt, familySize, monthlyExp],
  )

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const activePolicies  = policies.filter(p => p.is_active)
  const totalPremium    = activePolicies.reduce((s, p) => s + (p.monthly_premium ?? 0), 0)
  const totalCoverage   = activePolicies.reduce((s, p) => s + (p.coverage_amount ?? 0), 0)
  const largestGap      = resilience.gaps[0] ?? null

  // ── Duplicate detection ──────────────────────────────────────────────────
  const certainDuplicates: [InsurancePolicy, InsurancePolicy][] = []
  const potentialOverlaps: [InsurancePolicy, InsurancePolicy][] = []

  for (let i = 0; i < activePolicies.length; i++) {
    for (let j = i + 1; j < activePolicies.length; j++) {
      const a = activePolicies[i]
      const b = activePolicies[j]
      if (a.category === b.category) {
        if (a.provider && b.provider && a.provider === b.provider) {
          certainDuplicates.push([a, b])
        } else {
          potentialOverlaps.push([a, b])
        }
      }
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...EMPTY_FORM })
    setEditPolicy(null)
    setShowForm(true)
  }

  const openEdit = (policy: InsurancePolicy) => {
    setForm({
      name:            policy.name,
      category:        policy.category,
      provider:        policy.provider ?? '',
      monthly_premium: policy.monthly_premium != null ? String(policy.monthly_premium) : '',
      coverage_amount: policy.coverage_amount != null ? String(policy.coverage_amount) : '',
      start_date:      policy.start_date ?? '',
      end_date:        policy.end_date ?? '',
      beneficiary:     policy.beneficiary ?? '',
      notes:           policy.notes ?? '',
      is_active:       policy.is_active,
    })
    setEditPolicy(policy)
    setShowForm(true)
  }

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditPolicy(null)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      user_id:         user.id,
      name:            form.name.trim(),
      category:        form.category,
      provider:        form.provider.trim() || null,
      monthly_premium: form.monthly_premium ? parseFloat(form.monthly_premium) : null,
      coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
      start_date:      form.start_date || null,
      end_date:        form.end_date || null,
      beneficiary:     form.beneficiary.trim() || null,
      notes:           form.notes.trim() || null,
      is_active:       form.is_active,
    }

    if (editPolicy) {
      const { data } = await supabase
        .from('insurance_policies')
        .update(payload)
        .eq('id', editPolicy.id)
        .select()
        .single()
      if (data) setPolicies(prev => prev.map(p => p.id === editPolicy.id ? (data as InsurancePolicy) : p))
    } else {
      const { data } = await supabase
        .from('insurance_policies')
        .insert(payload)
        .select()
        .single()
      if (data) setPolicies(prev => [data as InsurancePolicy, ...prev])
    }

    setSaving(false)
    closeForm()
    startT(() => router.refresh())
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await supabase.from('insurance_policies').delete().eq('id', id)
    setPolicies(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
    startT(() => router.refresh())
  }

  // ── Verdict color / label ─────────────────────────────────────────────────
  const verdictColor =
    resilience.verdict === 'under_insured' ? 'text-red-400'
    : resilience.verdict === 'over_insured' ? 'text-amber-400'
    : 'text-emerald-400'

  const verdictLabel = ins.resilience[resilience.verdict]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#101A26]">

      {/* Header */}
      <div className="border-b border-[#2C3B38] bg-[#172530] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#445147]">{ins.section}</p>
            <h1 className="mt-1 text-xl font-bold text-[#F0EDE8]">{ins.title}</h1>
            <p className="mt-0.5 text-sm text-[#86968B]">{ins.subtitle}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-[#C8AA8F] px-4 py-2 text-sm font-semibold text-[#101A26] transition-opacity hover:opacity-90"
          >
            <Plus size={15} />
            {ins.addButton}
          </button>
        </div>

        {/* KPI strip */}
        {policies.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: ins.summary.activePolicies, value: String(activePolicies.length),       color: 'text-[#F0EDE8]' },
              { label: ins.summary.totalPremium,   value: fmtILS(totalPremium) + ' / חודש',   color: 'text-[#C8AA8F]' },
              { label: ins.summary.totalCoverage,  value: fmtILS(totalCoverage),               color: 'text-emerald-400' },
              { label: ins.summary.largestGap,     value: largestGap ? ins.categories[largestGap] : ins.summary.none, color: largestGap ? 'text-red-400' : 'text-emerald-400' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-[#2C3B38] bg-[#101A26]/60 px-4 py-3">
                <p className="text-xs text-[#445147]">{kpi.label}</p>
                <p className={`mt-1 text-base font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">

        {/* ── Resilience Gauge + Duplicate Detector ─────────────────────── */}
        <div className="grid gap-5 md:grid-cols-2">

          {/* Resilience gauge */}
          <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
            <p className="text-xs font-semibold tracking-widest text-[#445147]">{ins.resilience.title}</p>
            <p className="mt-0.5 mb-4 text-xs text-[#86968B]">{ins.resilience.subtitle}</p>

            <ResilienceGauge score={resilience.score} verdict={resilience.verdict} />

            <div className="mt-2 text-center">
              <span className={`text-sm font-bold ${verdictColor}`}>{verdictLabel}</span>
            </div>

            {/* Inputs */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-xs text-[#86968B]">{ins.resilience.familySize}</label>
                <select
                  value={familySize}
                  onChange={e => setFamilySize(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                >
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-xs text-[#86968B]">{ins.resilience.monthlyExpenses}</label>
                <input
                  type="number"
                  value={monthlyExp || ''}
                  onChange={e => setMonthlyExp(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                />
              </div>
            </div>

            {/* Gaps */}
            {resilience.gaps.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {resilience.gaps.map(gap => (
                  <div key={gap} className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs">
                    <AlertTriangle size={11} className="text-red-400 shrink-0" />
                    <span className="text-[#F0EDE8]">{ins.categories[gap]}</span>
                    <span className="text-red-400">— חסר</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duplicate detector */}
          <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
            <p className="text-xs font-semibold tracking-widest text-[#445147]">{ins.duplicates.title}</p>

            {certainDuplicates.length === 0 && potentialOverlaps.length === 0 ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span className="text-sm text-[#86968B]">{ins.duplicates.noDuplicates}</span>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {certainDuplicates.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-amber-400">{ins.duplicates.certain}</p>
                    {certainDuplicates.map(([a, b], idx) => (
                      <div key={idx} className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                          <span className="font-medium text-[#F0EDE8]">{ins.categories[a.category]}</span>
                          <span className="text-[#86968B]">— {ins.duplicates.sameProvider}: {a.provider}</span>
                        </div>
                        <div className="flex gap-3 text-[#86968B] ps-5">
                          <span>{a.name}</span>
                          <span>+</span>
                          <span>{b.name}</span>
                        </div>
                        <p className="ps-5 text-amber-400">
                          סה&quot;כ פרמיה: {fmtILS((a.monthly_premium ?? 0) + (b.monthly_premium ?? 0))} / חודש
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {potentialOverlaps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-[#86968B]">{ins.duplicates.potential}</p>
                    {potentialOverlaps.map(([a, b], idx) => (
                      <div key={idx} className="rounded-xl border border-[#2C3B38] bg-[#101A26]/40 p-3 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#F0EDE8]">{ins.categories[a.category]}</span>
                          <span className="text-[#86968B]">— {ins.duplicates.diffProvider}</span>
                        </div>
                        <div className="flex gap-3 text-[#86968B] ps-2">
                          <span>{a.provider || a.name}</span>
                          <span>+</span>
                          <span>{b.provider || b.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Category Cards (5 sections) ───────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ALL_CATS.map(cat => {
            const catPolicies = policies.filter(p => p.category === cat)
            const hasActive   = catPolicies.some(p => p.is_active)
            return (
              <div key={cat} className={`rounded-2xl border bg-[#172530] p-5 ${hasActive ? 'border-[#2C3B38]' : 'border-red-500/20'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CAT_ICONS[cat]}</span>
                    <p className="text-sm font-semibold text-[#F0EDE8]">{ins.categories[cat]}</p>
                  </div>
                  <button
                    onClick={() => { setForm({ ...EMPTY_FORM, category: cat }); setEditPolicy(null); setShowForm(true) }}
                    className="rounded-lg border border-[#2C3B38] p-1.5 text-[#86968B] transition-colors hover:bg-[#C8AA8F]/10 hover:text-[#C8AA8F]"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {catPolicies.length === 0 ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2">
                    <AlertTriangle size={11} className="text-red-400 shrink-0" />
                    <span className="text-xs text-[#86968B]">לא מבוטח בקטגוריה זו</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {catPolicies.map(p => (
                      <div key={p.id} className="rounded-xl border border-[#2C3B38] bg-[#101A26]/50 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[#F0EDE8]">{p.name}</p>
                            {p.provider && <p className="text-xs text-[#86968B]">{p.provider}</p>}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className={`rounded-full px-1.5 py-0.5 text-xs ${p.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#445147] bg-[#2C3B38]'}`}>
                              {p.is_active ? ins.card.active : ins.card.inactive}
                            </span>
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded-lg p-1 text-[#86968B] hover:bg-[#2C3B38] hover:text-[#F0EDE8] transition-colors"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-1.5 flex gap-3 text-xs text-[#445147]">
                          {p.monthly_premium != null && (
                            <span>{ins.card.premium}: <span className="text-[#C8AA8F]">{fmtILS(p.monthly_premium)}</span></span>
                          )}
                          {p.coverage_amount != null && (
                            <span>{ins.card.coverage}: <span className="text-emerald-400">{fmtILS(p.coverage_amount)}</span></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── All Policies Table ────────────────────────────────────────── */}
        {policies.length > 0 && (
          <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] overflow-hidden">
            <div className="border-b border-[#2C3B38] px-5 py-3">
              <p className="text-xs font-semibold tracking-widest text-[#445147]">כל הפוליסות</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2C3B38]">
                    {['שם', 'קטגוריה', ins.card.provider, ins.card.premium, ins.card.coverage, ins.card.beneficiary, ins.card.endDate, ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-right font-medium text-[#445147]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {policies.map(p => (
                    <tr key={p.id} className="border-b border-[#2C3B38]/50 hover:bg-[#101A26]/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#F0EDE8]">
                        <div className="flex items-center gap-1.5">
                          <span>{CAT_ICONS[p.category]}</span>
                          <span>{p.name}</span>
                          {!p.is_active && <span className="rounded px-1 text-xs text-[#445147] bg-[#2C3B38]">לא פעיל</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#86968B]">{ins.categories[p.category]}</td>
                      <td className="px-4 py-3 text-[#86968B]">{p.provider ?? '—'}</td>
                      <td className="px-4 py-3 text-[#C8AA8F]">{p.monthly_premium != null ? fmtILS(p.monthly_premium) : '—'}</td>
                      <td className="px-4 py-3 text-emerald-400">{p.coverage_amount != null ? fmtILS(p.coverage_amount) : '—'}</td>
                      <td className="px-4 py-3 text-[#86968B]">{p.beneficiary ?? '—'}</td>
                      <td className="px-4 py-3 text-[#86968B]">{fmtDate(p.end_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-lg p-1.5 text-[#86968B] hover:bg-[#2C3B38] hover:text-[#F0EDE8] transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deleting === p.id}
                            className="rounded-lg p-1.5 text-[#86968B] hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {policies.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#2C3B38] bg-[#172530]">
              <Shield size={28} className="text-[#445147]" />
            </div>
            <p className="text-base font-semibold text-[#F0EDE8]">{ins.emptyTitle}</p>
            <p className="text-sm text-[#445147]">{ins.emptyHint}</p>
            <button
              onClick={openAdd}
              className="mt-2 flex items-center gap-2 rounded-xl bg-[#C8AA8F] px-4 py-2 text-sm font-semibold text-[#101A26] hover:opacity-90"
            >
              <Plus size={14} />
              {ins.addButton}
            </button>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-10 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#2C3B38] bg-[#172530] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2C3B38] px-6 py-4">
              <h2 className="text-base font-semibold text-[#F0EDE8]">
                {editPolicy ? ins.form.editTitle : ins.form.addTitle}
              </h2>
              <button onClick={closeForm} className="text-[#86968B] hover:text-[#F0EDE8]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* Name */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.name}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={ins.form.namePlaceholder}
                  className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                  dir="auto"
                />
              </div>

              {/* Category + Provider */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.category}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as InsuranceCategory }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  >
                    {ALL_CATS.map(cat => (
                      <option key={cat} value={cat}>{ins.categories[cat]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.provider}</label>
                  <input
                    type="text"
                    value={form.provider}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                    placeholder={ins.form.providerPh}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                    dir="auto"
                  />
                </div>
              </div>

              {/* Premium + Coverage */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.premium}</label>
                  <input
                    type="number"
                    value={form.monthly_premium}
                    onChange={e => setForm(f => ({ ...f, monthly_premium: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.coverage}</label>
                  <input
                    type="number"
                    value={form.coverage_amount}
                    onChange={e => setForm(f => ({ ...f, coverage_amount: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Start + End dates */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.startDate}</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.endDate}</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] focus:border-[#C8AA8F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Beneficiary */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.beneficiary}</label>
                <input
                  type="text"
                  value={form.beneficiary}
                  onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))}
                  placeholder={ins.form.beneficiaryPh}
                  className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                  dir="auto"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[#86968B]">{ins.form.notes}</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5 text-sm text-[#F0EDE8] placeholder-[#445147] focus:border-[#C8AA8F] focus:outline-none"
                  dir="auto"
                />
              </div>

              {/* Is Active */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="accent-[#C8AA8F]"
                />
                <span className="text-sm text-[#F0EDE8]">{ins.form.isActive}</span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 border-t border-[#2C3B38] pt-4">
                {editPolicy && (
                  <button
                    onClick={() => handleDelete(editPolicy.id)}
                    disabled={deleting === editPolicy.id}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    {ins.form.delete}
                  </button>
                )}
                <div className="flex gap-2 ms-auto">
                  <button
                    onClick={closeForm}
                    className="rounded-xl border border-[#2C3B38] px-4 py-2 text-sm text-[#86968B] hover:bg-[#2C3B38]/50 transition-colors"
                  >
                    {ins.form.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#C8AA8F] px-5 py-2 text-sm font-semibold text-[#101A26] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {saving && <span className="animate-spin">↻</span>}
                    {saving ? ins.form.saving : ins.form.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
