'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────

export interface Track {
  id:               string
  name:             string
  track_type:       string
  original_amount:  number
  remaining_balance: number
  interest_rate:    number
  monthly_payment:  number
}

interface Props {
  tracks:         Track[]
  remainingMonths: number
  principalLabel: string
  interestLabel:  string
  title:          string
  subtitle:       string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function pmt(principal: number, annualRate: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0
  if (annualRate === 0) return principal / months
  const r = annualRate / 100 / 12
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

function buildYearlyAmort(
  principal:   number,
  annualRate:  number,
  totalMonths: number,
): { year: number; principal: number; interest: number }[] {
  const monthlyPmt = pmt(principal, annualRate, totalMonths)
  let balance = principal
  const data: { year: number; principal: number; interest: number }[] = []
  let yearPrincipal = 0
  let yearInterest  = 0

  for (let m = 1; m <= totalMonths; m++) {
    const r          = annualRate / 100 / 12
    const intPart    = balance * r
    const prinPart   = monthlyPmt - intPart
    yearInterest  += intPart
    yearPrincipal += prinPart
    balance        = Math.max(0, balance - prinPart)

    if (m % 12 === 0 || m === totalMonths) {
      const yr = Math.ceil(m / 12)
      if (data[yr - 1]) {
        data[yr - 1].principal += yearPrincipal
        data[yr - 1].interest  += yearInterest
      } else {
        data.push({ year: yr, principal: Math.round(yearPrincipal), interest: Math.round(yearInterest) })
      }
      yearPrincipal = 0
      yearInterest  = 0
    }
  }
  return data
}

const fmt = (v: number) =>
  v >= 1_000_000
    ? `₪${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `₪${Math.round(v / 1_000)}k`
    : `₪${Math.round(v)}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#2C3B38] bg-[#1A2B29] px-3 py-2.5 text-xs shadow-xl">
      <p className="mb-1.5 font-semibold text-[#F0EDE8]">שנה {label}</p>
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

// ── Component ───────────────────────────────────────────────────────────────

export default function AmortizationChart({
  tracks, remainingMonths, principalLabel, interestLabel, title, subtitle,
}: Props) {
  if (tracks.length === 0 || remainingMonths <= 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[#445147]">
        אין נתונים לתרשים
      </div>
    )
  }

  // Merge all tracks into combined yearly amortization
  const maxYears = Math.ceil(remainingMonths / 12)
  const combined: { year: number; principal: number; interest: number }[] =
    Array.from({ length: maxYears }, (_, i) => ({ year: i + 1, principal: 0, interest: 0 }))

  for (const track of tracks) {
    const trackMonths = Math.min(remainingMonths, Math.ceil(track.remaining_balance / (pmt(track.remaining_balance, track.interest_rate, remainingMonths) || 1) * 12))
    const rows = buildYearlyAmort(track.remaining_balance, track.interest_rate, remainingMonths)
    rows.forEach((r, i) => {
      if (combined[i]) {
        combined[i].principal += r.principal
        combined[i].interest  += r.interest
      }
    })
    void trackMonths
  }

  const data = combined.map(r => ({
    year:           r.year,
    [principalLabel]: Math.round(r.principal),
    [interestLabel]:  Math.round(r.interest),
  }))

  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{title}</p>
      <p className="mb-4 text-xs text-[#86968B]">{subtitle}</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#2C3B38" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: '#86968B', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
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
            <Bar dataKey={principalLabel} stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
            <Bar dataKey={interestLabel}  stackId="a" fill="#C8AA8F"  radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
