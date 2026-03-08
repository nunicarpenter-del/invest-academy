'use client'

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { useLang } from '@/contexts/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────

interface Investment {
  asset_type:     string
  quantity:       number
  purchase_price: number | null
  currency:       string
  symbol:         string | null
  sector:         string | null
  exchange:       string | null
  purchase_date:  string | null
  live_price?:    number | null
  live_currency?: string | null
}

interface Props {
  investments: Investment[]
  ilsMode:     boolean
  usdRate:     number
}

// ── Palette ───────────────────────────────────────────────────────────────

const PIE_COLORS = ['#C8AA8F','#86968B','#6366F1','#10B981','#3B82F6','#F97316','#EC4899','#14B8A6','#A78BFA','#F59E0B']

const MARKET_COLORS: Record<string, string> = {
  US:     '#3B82F6',
  Israel: '#C8AA8F',
  Crypto: '#F97316',
  Other:  '#86968B',
}

// ── Helpers ────────────────────────────────────────────────────────────────

const n = (v: number | null | undefined) => v ?? 0

const toIls = (val: number, cur: string, rate: number) =>
  cur.toUpperCase() === 'USD' ? val * rate : val

const posValue = (inv: Investment, ilsMode: boolean, rate: number) => {
  const price = inv.live_price ?? inv.purchase_price
  const cur   = inv.live_currency ?? inv.currency
  if (price == null) return 0
  const raw = price * n(inv.quantity)
  return ilsMode ? toIls(raw, cur, rate) : raw
}

const deriveMarket = (inv: Investment): string => {
  if (inv.asset_type === 'crypto') return 'Crypto'
  if (inv.exchange) {
    if (inv.exchange === 'TASE') return 'Israel'
    if (['NASDAQ','NYSE'].includes(inv.exchange)) return 'US'
    if (inv.exchange === 'CRYPTO') return 'Crypto'
  }
  // Fallback from symbol
  if (inv.symbol?.endsWith('.TA')) return 'Israel'
  if (inv.symbol?.endsWith('-USD')) return 'Crypto'
  return 'US'
}

// ── Custom tooltip ─────────────────────────────────────────────────────────

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="rounded-xl border border-[#2C3B38] bg-[#172530] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-[#F0EDE8]">{name}</p>
      <p className="text-[#C8AA8F]">₪{value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</p>
    </div>
  )
}

const LineTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[#2C3B38] bg-[#172530] px-3 py-2 text-xs shadow-xl">
      <p className="text-[#86968B]">{label}</p>
      <p className="font-semibold text-[#C8AA8F]">₪{payload[0].value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</p>
    </div>
  )
}

// ── Mini pie chart ─────────────────────────────────────────────────────────

function MiniPie({
  title, data, colors,
}: {
  title: string
  data: { name: string; value: number }[]
  colors: string[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  return (
    <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
      <p className="mb-4 text-xs font-semibold tracking-widest text-[#445147]">{title}</p>
      <div className="flex items-center gap-4">
        <div className="h-[120px] w-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={52}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          {data.slice(0, 6).map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
                <span className="truncate text-xs text-[#86968B]">{d.name}</span>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#F0EDE8]">
                {((d.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Exposure battery ───────────────────────────────────────────────────────

function ExposureBattery({ stocks, crypto, other }: { stocks: number; crypto: number; other: number }) {
  const { t } = useLang()
  const total = stocks + crypto + other
  if (total === 0) return null

  const segments = [
    { label: t.dashboard.allocation.stocks, value: stocks, color: '#3B82F6' },
    { label: t.dashboard.allocation.crypto, value: crypto, color: '#F97316' },
    { label: t.dir === 'rtl' ? 'אחר' : 'Other', value: other, color: '#86968B' },
  ].filter((s) => s.value > 0)

  return (
    <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5">
      <p className="mb-4 text-xs font-semibold tracking-widest text-[#445147]">
        {t.dir === 'rtl' ? 'חשיפת תיק' : 'Portfolio Exposure'}
      </p>
      {/* Stacked bar */}
      <div className="flex h-8 overflow-hidden rounded-xl">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            className="transition-all"
          />
        ))}
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-col gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-[#86968B]">{s.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#86968B]">
                ₪{s.value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </span>
              <span className="min-w-[36px] text-right text-xs font-semibold text-[#F0EDE8]">
                {((s.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Growth chart ───────────────────────────────────────────────────────────

function GrowthChart({ investments, ilsMode, usdRate }: Props) {
  const { t } = useLang()

  if (!investments.some((i) => i.purchase_date && i.purchase_price != null)) return null

  // Build monthly cumulative cost data
  const sorted = [...investments]
    .filter((i) => i.purchase_date && i.purchase_price != null)
    .sort((a, b) => a.purchase_date!.localeCompare(b.purchase_date!))

  if (sorted.length === 0) return null

  const firstDate = new Date(sorted[0].purchase_date!)
  const now       = new Date()

  // Build data points month by month
  const points: { month: string; value: number }[] = []
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)

  while (cursor <= now) {
    const label = cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const end   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)

    const value = investments
      .filter((i) => i.purchase_date && new Date(i.purchase_date) < end)
      .reduce((s, i) => {
        const cost = n(i.purchase_price) * n(i.quantity)
        const cur  = i.currency
        return s + (ilsMode ? toIls(cost, cur, usdRate) : cost)
      }, 0)

    points.push({ month: label, value: Math.round(value) })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Show at most 24 months
  const data = points.slice(-24)

  return (
    <div className="rounded-2xl border border-[#2C3B38] bg-[#172530] p-5 col-span-2">
      <p className="mb-4 text-xs font-semibold tracking-widest text-[#445147]">
        {t.dir === 'rtl' ? 'צמיחת תיק ההשקעות (עלות בסיס)' : 'Portfolio Growth (Cost Basis)'}
      </p>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#2C3B38" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#86968B' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#86968B' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => '₪' + (v / 1000).toFixed(0) + 'k'}
              width={52}
            />
            <Tooltip content={<LineTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#C8AA8F"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#C8AA8F', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export default function InvestmentCharts({ investments, ilsMode, usdRate }: Props) {
  const { t } = useLang()

  if (investments.length === 0) return null

  // Sector breakdown
  const sectorMap = new Map<string, number>()
  investments.forEach((inv) => {
    const sector = inv.sector || (t.dir === 'rtl' ? 'לא מסווג' : 'Unclassified')
    const val    = posValue(inv, ilsMode, usdRate)
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + val)
  })
  const sectorData = [...sectorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }))

  // Market breakdown
  const marketMap = new Map<string, number>()
  investments.forEach((inv) => {
    const market = deriveMarket(inv)
    const val    = posValue(inv, ilsMode, usdRate)
    marketMap.set(market, (marketMap.get(market) ?? 0) + val)
  })
  const marketData = [...marketMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.round(value) }))
  const marketColors = marketData.map((d) => MARKET_COLORS[d.name] ?? '#86968B')

  // Exposure
  const stockVal  = investments.filter((i) => ['stock','etf','fund','bond'].includes(i.asset_type)).reduce((s, i) => s + posValue(i, ilsMode, usdRate), 0)
  const cryptoVal = investments.filter((i) => i.asset_type === 'crypto').reduce((s, i) => s + posValue(i, ilsMode, usdRate), 0)
  const otherVal  = investments.filter((i) => i.asset_type === 'other').reduce((s, i) => s + posValue(i, ilsMode, usdRate), 0)

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold tracking-widest text-[#445147]">
        {t.dir === 'rtl' ? 'ניתוח תיק' : 'Portfolio Analysis'}
      </p>

      {/* Top row: sector + market pies + exposure battery */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniPie
          title={t.dir === 'rtl' ? 'פילוח לפי סקטור' : 'Sector Breakdown'}
          data={sectorData}
          colors={PIE_COLORS}
        />
        <MiniPie
          title={t.dir === 'rtl' ? 'פילוח לפי שוק' : 'Market Breakdown'}
          data={marketData}
          colors={marketColors}
        />
        <ExposureBattery stocks={stockVal} crypto={cryptoVal} other={otherVal} />
      </div>

      {/* Growth chart — full width */}
      <div className="grid grid-cols-1">
        <GrowthChart investments={investments} ilsMode={ilsMode} usdRate={usdRate} />
      </div>
    </div>
  )
}
