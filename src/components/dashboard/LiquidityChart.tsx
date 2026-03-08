'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import { useLang } from '@/contexts/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CapitalSource {
  id: string
  name: string
  current_balance: number
  estimated_yield: number
  liquidity_date: string | null
  allocated_to_property_id: string | null
  allocated_amount: number | null
}

interface Props {
  sources: CapitalSource[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function futureValue(pv: number, annualYield: number, months: number): number {
  if (months <= 0) return pv
  const r = annualYield / 100 / 12
  return pv * Math.pow(1 + r, months)
}

function monthsDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

const fmt = (v: number) =>
  v >= 1_000_000
    ? `₪${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `₪${Math.round(v / 1_000)}k`
      : `₪${Math.round(v).toLocaleString('he-IL')}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#2C3B38] bg-[#1A2B29] px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-[#F0EDE8]">{label}</p>
      {payload.map((p: { name: string; value: number; fill: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-[#86968B]">{p.name}</span>
          </div>
          <span className="font-bold text-[#C8AA8F]">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LiquidityChart({ sources }: Props) {
  const { t } = useLang()
  const ch = t.capital.chart
  const now = new Date()

  // Build data for each of the next 5 years (end-of-year snapshot)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() + i)

  const data = years.map((year) => {
    const endOfYear = new Date(year, 11, 31)
    let unlocked = 0
    let locked   = 0

    for (const src of sources) {
      const months = monthsDiff(now, endOfYear)
      const fv     = futureValue(src.current_balance, src.estimated_yield, months)
      const isLiquid = !src.liquidity_date || new Date(src.liquidity_date) <= endOfYear
      const allocAmt = src.allocated_amount ?? src.current_balance
      const allocFV  = futureValue(allocAmt, src.estimated_yield, months)

      if (src.allocated_to_property_id) {
        locked   += allocFV
        if (isLiquid) unlocked += Math.max(0, fv - allocFV)
      } else {
        if (isLiquid) unlocked += fv
      }
    }

    return { year: String(year), [ch.unlocked]: Math.round(unlocked), [ch.locked]: Math.round(locked) }
  })

  if (sources.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-[#445147]">
        {t.capital.emptyHint}
      </div>
    )
  }

  const today = new Date()
  const todayLabel = String(today.getFullYear())

  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{ch.title}</p>
      <p className="mb-4 text-xs text-[#86968B]">{ch.subtitle}</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#2C3B38" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: '#86968B', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fill: '#445147', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2C3B38', opacity: 0.4 }} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#86968B', paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            <ReferenceLine x={todayLabel} stroke="#C8AA8F" strokeDasharray="4 2" strokeWidth={1.5} />
            <Bar dataKey={ch.locked}   stackId="a" fill="#C8AA8F"  radius={[0, 0, 4, 4]} />
            <Bar dataKey={ch.unlocked} stackId="a" fill="#10B981"  radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
