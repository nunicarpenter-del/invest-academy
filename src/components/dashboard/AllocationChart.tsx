'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export interface AllocationItem {
  name:  string
  value: number
  color: string
}

interface Props {
  data:        AllocationItem[]
  total:       number
  emptyLabel:  string
  totalLabel?: string
  accentColor?: string
}

const fmt = (n: number) =>
  '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })

const pct = (v: number, total: number) =>
  total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value, color } = payload[0].payload
  return (
    <div className="rounded-lg border border-[#2C3B38] bg-[#1A2B29] px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="font-semibold text-[#F0EDE8]">{name}</span>
      </div>
      <p className="text-[#C8AA8F] font-bold">{fmt(value)}</p>
    </div>
  )
}

export default function AllocationChart({ data, total, emptyLabel, totalLabel = 'Total', accentColor = '#C8AA8F' }: Props) {
  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#445147]">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      {/* Donut */}
      <div className="shrink-0 w-full lg:w-56 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-1 flex-col gap-3">
        {data.map(item => (
          <div key={item.name} className="flex items-center gap-3">
            {/* Color dot */}
            <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ background: item.color }} />

            {/* Label */}
            <span className="flex-1 text-sm text-[#F0EDE8]">{item.name}</span>

            {/* Progress bar */}
            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-[#2C3B38] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: pct(item.value, total), background: item.color }}
              />
            </div>

            {/* Percent */}
            <span className="w-12 text-right text-xs font-semibold text-[#86968B]">
              {pct(item.value, total)}
            </span>

            {/* Value */}
            <span className="w-28 text-right text-sm font-bold text-[#F0EDE8]">
              {fmt(item.value)}
            </span>
          </div>
        ))}

        {/* Total row */}
        <div className="mt-1 flex items-center gap-3 border-t border-[#2C3B38] pt-3">
          <div className="w-2.5 h-2.5 shrink-0" />
          <span className="flex-1 text-xs font-semibold uppercase tracking-widest text-[#445147]">
            {totalLabel}
          </span>
          <div className="hidden sm:block w-24" />
          <span className="w-12" />
          <span className="w-28 text-right text-sm font-bold" style={{ color: accentColor }}>
            {fmt(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
