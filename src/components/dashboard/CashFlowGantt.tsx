'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { useLang } from '@/contexts/LanguageContext'

interface Transaction {
  flow_type: 'income' | 'expense'
  amount: number
  date: string
}

interface PropertyCF {
  monthly_rent: number | null
  mortgage_monthly_payment: number | null
  other_expenses: number | null
}

interface Props {
  transactions: Transaction[]
  properties:   PropertyCF[]
  activeMonth:  number | null
  onMonthClick: (month: number) => void
}

const MONTHS_HE = ['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ']
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const fmt = (v: number) => '₪' + Math.abs(v).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill: string }[]; label?: string }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-[#2C3B38] bg-[#1A2B29] p-3 shadow-xl">
      <p className="mb-2 text-xs font-bold text-[#F0EDE8]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.fill }} />
          <span className="text-[#86968B]">{entry.name}:</span>
          <span className="font-semibold text-[#F0EDE8]">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CashFlowGantt({ transactions, properties, activeMonth, onMonthClick }: Props) {
  const { lang } = useLang()
  const monthLabels = lang === 'he' ? MONTHS_HE : MONTHS_EN
  const currentYear = new Date().getFullYear()

  // Monthly recurring from properties
  const propIncome   = properties.reduce((s, p) => s + (p.monthly_rent ?? 0), 0)
  const propExpenses = properties.reduce((s, p) => s + (p.mortgage_monthly_payment ?? 0) + (p.other_expenses ?? 0), 0)

  const data = Array.from({ length: 12 }, (_, i) => {
    const txIncome = transactions
      .filter(tx =>
        tx.flow_type === 'income' &&
        new Date(tx.date + 'T00:00:00').getMonth() === i &&
        new Date(tx.date + 'T00:00:00').getFullYear() === currentYear
      )
      .reduce((s, tx) => s + tx.amount, 0)

    const txExpenses = transactions
      .filter(tx =>
        tx.flow_type === 'expense' &&
        new Date(tx.date + 'T00:00:00').getMonth() === i &&
        new Date(tx.date + 'T00:00:00').getFullYear() === currentYear
      )
      .reduce((s, tx) => s + tx.amount, 0)

    return {
      month:    monthLabels[i],
      index:    i,
      income:   Math.round(txIncome + propIncome),
      expenses: Math.round(txExpenses + propExpenses),
    }
  })

  const incomeLabel   = lang === 'he' ? 'הכנסות' : 'Income'
  const expensesLabel = lang === 'he' ? 'הוצאות' : 'Expenses'

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        barCategoryGap="30%"
        barGap={3}
        onClick={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = e as any
          if (data?.activePayload?.[0]?.payload?.index != null) {
            onMonthClick(data.activePayload[0].payload.index as number)
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2C3B38" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#86968B', fontSize: 11 }}
          axisLine={{ stroke: '#2C3B38' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#86968B', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => v === 0 ? '0' : `₪${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2C3B38', opacity: 0.4 }} />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: '#86968B', paddingTop: 8 }}
        />
        <Bar dataKey="income" name={incomeLabel} fill="#34d399" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.index}
              fill={activeMonth === entry.index ? '#10b981' : '#34d399'}
              opacity={activeMonth !== null && activeMonth !== entry.index ? 0.4 : 1}
            />
          ))}
        </Bar>
        <Bar dataKey="expenses" name={expensesLabel} fill="#C8AA8F" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.index}
              fill={activeMonth === entry.index ? '#e0c9a8' : '#C8AA8F'}
              opacity={activeMonth !== null && activeMonth !== entry.index ? 0.4 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
