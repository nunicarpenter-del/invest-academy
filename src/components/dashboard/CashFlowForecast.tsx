'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { useLang } from '@/contexts/LanguageContext'

interface Transaction {
  flow_type: 'income' | 'expense'
  amount:    number
  date:      string
}

interface PropertyCF {
  monthly_rent:             number | null
  mortgage_monthly_payment: number | null
  other_expenses:           number | null
}

interface Props {
  transactions: Transaction[]
  properties:   PropertyCF[]
}

const MONTHS_HE = ['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ']
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const fmt = (v: number) => '₪' + Math.abs(v).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string; dataKey: string }[]; label?: string }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-[#2C3B38] bg-[#1A2B29] p-3 shadow-xl">
      <p className="mb-2 text-xs font-bold text-[#F0EDE8]">{label}</p>
      {payload.filter(e => e.dataKey !== 'band').map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[#86968B]">{entry.name}:</span>
          <span className="font-semibold text-[#F0EDE8]">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CashFlowForecast({ transactions, properties }: Props) {
  const { lang } = useLang()
  const monthLabels = lang === 'he' ? MONTHS_HE : MONTHS_EN

  const propIncome   = properties.reduce((s, p) => s + (p.monthly_rent ?? 0), 0)
  const propExpenses = properties.reduce((s, p) => s + (p.mortgage_monthly_payment ?? 0) + (p.other_expenses ?? 0), 0)
  const propNet      = propIncome - propExpenses

  const today = new Date()
  const currentYear  = today.getFullYear()
  const currentMonth = today.getMonth()

  // Compute net for each past month this year
  const pastMonths: { label: string; net: number | null; forecast: null; bandHigh: null; bandLow: null }[] = []
  for (let i = 0; i <= currentMonth; i++) {
    const txIncome = transactions
      .filter(tx =>
        tx.flow_type === 'income' &&
        new Date(tx.date + 'T00:00:00').getMonth() === i &&
        new Date(tx.date + 'T00:00:00').getFullYear() === currentYear
      ).reduce((s, tx) => s + tx.amount, 0)

    const txExpenses = transactions
      .filter(tx =>
        tx.flow_type === 'expense' &&
        new Date(tx.date + 'T00:00:00').getMonth() === i &&
        new Date(tx.date + 'T00:00:00').getFullYear() === currentYear
      ).reduce((s, tx) => s + tx.amount, 0)

    pastMonths.push({
      label: `${monthLabels[i]} ${currentYear}`,
      net:   Math.round(txIncome - txExpenses + propNet),
      forecast: null,
      bandHigh: null,
      bandLow:  null,
    })
  }

  // Average of last 3 months (or however many are available)
  const lookback = pastMonths.slice(-3)
  const avgNet = lookback.length > 0
    ? Math.round(lookback.reduce((s, m) => s + (m.net ?? 0), 0) / lookback.length)
    : propNet

  // Variance band: ±15%
  const band = Math.abs(avgNet * 0.15)

  // If we already have the full year, still project 6 months into next year
  const futureMonths: { label: string; net: null; forecast: number; bandHigh: number; bandLow: number }[] = []
  const forecastCount = Math.max(6, 12 - currentMonth - 1)
  for (let j = 1; j <= forecastCount; j++) {
    const futureDate = new Date(currentYear, currentMonth + j, 1)
    const mIdx = futureDate.getMonth()
    const yr   = futureDate.getFullYear()
    futureMonths.push({
      label:    `${monthLabels[mIdx]} ${yr}`,
      net:      null,
      forecast: avgNet,
      bandHigh: avgNet + band,
      bandLow:  Math.max(0, avgNet - band),
    })
  }

  const chartData = [...pastMonths, ...futureMonths]

  const actualLabel   = lang === 'he' ? 'בפועל'  : 'Actual'
  const forecastLabel = lang === 'he' ? 'תחזית'  : 'Forecast'

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C3B38" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#86968B', fontSize: 10 }}
          axisLine={{ stroke: '#2C3B38' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#86968B', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v === 0 ? '0' : `₪${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2C3B38' }} />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: '#86968B', paddingTop: 8 }}
        />
        <ReferenceLine y={0} stroke="#2C3B38" strokeDasharray="4 2" />

        {/* Uncertainty band (forecast area) */}
        <Area
          dataKey="bandHigh"
          fill="#C8AA8F"
          fillOpacity={0.1}
          stroke="none"
          legendType="none"
          name="band"
        />
        <Area
          dataKey="bandLow"
          fill="#101A26"
          fillOpacity={1}
          stroke="none"
          legendType="none"
          name="band"
        />

        {/* Actual line */}
        <Line
          dataKey="net"
          name={actualLabel}
          stroke="#34d399"
          strokeWidth={2}
          dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />

        {/* Forecast line */}
        <Line
          dataKey="forecast"
          name={forecastLabel}
          stroke="#C8AA8F"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 4, fill: '#C8AA8F' }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
