'use client'

import { X, Info, BarChart2 } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComparableTx {
  date: string
  street: string
  sqm: number
  price: number
  pricePerSqm: number
}

// ── Seeded pseudo-random number generator ─────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = (seed ^ 0x9e3779b9) >>> 0
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

function strSeed(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

// ── City extraction ───────────────────────────────────────────────────────────

const CITY_MAP: Array<[string, string]> = [
  ['תל אביב', 'תל אביב'], ['Tel Aviv', 'תל אביב'],
  ['ירושלים', 'ירושלים'], ['Jerusalem', 'ירושלים'],
  ['חיפה', 'חיפה'],       ['Haifa', 'חיפה'],
  ['רמת גן', 'רמת גן'],   ['Ramat Gan', 'רמת גן'],
  ['גבעתיים', 'גבעתיים'],
  ['פתח תקווה', 'פתח תקווה'], ['Petah Tikva', 'פתח תקווה'],
  ['ראשון לציון', 'ראשון לציון'], ['Rishon', 'ראשון לציון'],
  ['נתניה', 'נתניה'],     ['Netanya', 'נתניה'],
  ['הרצליה', 'הרצליה'],   ['Herzliya', 'הרצליה'],
  ['כפר סבא', 'כפר סבא'], ['Kfar Saba', 'כפר סבא'],
  ['רחובות', 'רחובות'],   ['Rehovot', 'רחובות'],
  ['בני ברק', 'בני ברק'], ['Bnei Brak', 'בני ברק'],
  ['חולון', 'חולון'],     ['Holon', 'חולון'],
  ['בת ים', 'בת ים'],     ['Bat Yam', 'בת ים'],
  ['רעננה', 'רעננה'],     ['Raanana', 'רעננה'],
  ['מודיעין', 'מודיעין'],
  ['נס ציונה', 'נס ציונה'],
  ['אשדוד', 'אשדוד'],     ['Ashdod', 'אשדוד'],
  ['אשקלון', 'אשקלון'],
  ['באר שבע', 'באר שבע'], ['Beer Sheva', 'באר שבע'],
  ['רמת השרון', 'רמת השרון'],
  ['הוד השרון', 'הוד השרון'],
  ['כפר יונה', 'כפר יונה'],
  ['לוד', 'לוד'],
  ['רמלה', 'רמלה'],
]

function extractCity(address: string | null): string {
  if (!address) return 'ישראל'
  for (const [pattern, city] of CITY_MAP) {
    if (address.includes(pattern)) return city
  }
  return 'ישראל'
}

// ── Price ranges (₪/sqm) by city ─────────────────────────────────────────────

const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  'תל אביב':     { min: 28000, max: 44000 },
  'ירושלים':     { min: 16000, max: 28000 },
  'חיפה':        { min: 7500,  max: 14500 },
  'רמת גן':      { min: 19000, max: 31000 },
  'גבעתיים':     { min: 22000, max: 35000 },
  'פתח תקווה':   { min: 9500,  max: 16000 },
  'ראשון לציון': { min: 11000, max: 18500 },
  'נתניה':       { min: 8500,  max: 15000 },
  'הרצליה':      { min: 17000, max: 30000 },
  'כפר סבא':     { min: 11000, max: 18000 },
  'רחובות':      { min: 7500,  max: 13000 },
  'בני ברק':     { min: 13500, max: 22500 },
  'חולון':       { min: 9500,  max: 16000 },
  'בת ים':       { min: 9000,  max: 15500 },
  'רעננה':       { min: 13500, max: 21000 },
  'מודיעין':     { min: 9000,  max: 15000 },
  'נס ציונה':    { min: 8500,  max: 14000 },
  'אשדוד':       { min: 6500,  max: 11000 },
  'אשקלון':      { min: 5500,  max: 9500 },
  'באר שבע':     { min: 4500,  max: 8500 },
  'רמת השרון':   { min: 17000, max: 27000 },
  'הוד השרון':   { min: 11000, max: 18000 },
  'ישראל':       { min: 9000,  max: 16000 },
}

// ── Street names by city ──────────────────────────────────────────────────────

const CITY_STREETS: Record<string, string[]> = {
  'תל אביב':     ['רוטשילד', 'דיזנגוף', 'אבן גבירול', 'בן יהודה', 'שלמה המלך', 'ארלוזורוב', 'הירקון', "קינג ג'ורג"],
  'ירושלים':     ['יפו', 'בן יהודה', 'עמק רפאים', 'הנביאים', 'כנפי נשרים', 'הרצל', 'אגריפס', 'רחל אמנו'],
  'חיפה':        ['הנשיא', 'יפה נוף', 'בן גוריון', 'הגפן', 'חסן שוקרי', 'שדרות הנסיאות'],
  'רמת גן':      ['ביאליק', "ז'בוטינסקי", 'אבא הלל', 'בורוכוב', 'קרית שרת', 'הירדן'],
  'גבעתיים':     ['כצנלסון', 'ויצמן', 'בורוכוב', 'דרך טבנקין', 'הרימון'],
  'הרצליה':      ['הגפן', 'הדגן', 'הרדוף', 'ירושלים', 'כצנלסון', 'הצבעוני'],
  'פתח תקווה':   ["ז'בוטינסקי", 'הרצל', 'ביאליק', 'שדרות קיבוץ גלויות', 'אחד העם'],
  'ראשון לציון': ['רוטשילד', 'הרצל', 'ביאליק', "שד' מנחם בגין", 'ויצמן'],
  'ישראל':       ['הרצל', 'ביאליק', "ז'בוטינסקי", 'וייצמן', 'בן גוריון', 'הנשיא', 'רוטשילד'],
}

function getStreets(city: string): string[] {
  return CITY_STREETS[city] ?? CITY_STREETS['ישראל']
}

// ── Mock transaction generator ────────────────────────────────────────────────

function generateMockTx(address: string | null): ComparableTx[] {
  const city    = extractCity(address)
  const range   = PRICE_RANGES[city] ?? PRICE_RANGES['ישראל']
  const streets = getStreets(city)
  const rand    = seededRand(strSeed(address ?? city))

  const now  = new Date()
  const txns: ComparableTx[] = []

  for (let i = 0; i < 7; i++) {
    const mAgo  = Math.floor(rand() * 14) + 1
    const d     = new Date(now.getFullYear(), now.getMonth() - mAgo, 1)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year  = d.getFullYear()

    const si       = Math.floor(rand() * streets.length)
    const num      = Math.floor(rand() * 90) + 3
    const sqm      = Math.round((rand() * 95 + 50) / 5) * 5   // 50–145 step 5
    const ppsq     = Math.round((rand() * (range.max - range.min) + range.min) / 500) * 500
    const price    = sqm * ppsq

    txns.push({
      date:        `${month}/${year}`,
      street:      `${streets[si]} ${num}`,
      sqm,
      price,
      pricePerSqm: ppsq,
    })
  }

  return txns.sort((a, b) => b.date.localeCompare(a.date))
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  address: string | null
  propertyName: string
  onClose: () => void
}

const fmtILS = (n: number) =>
  '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })

export default function CMAModal({ address, propertyName, onClose }: Props) {
  const { t } = useLang()
  const cm    = t.properties.cma

  const city    = extractCity(address)
  const txns    = generateMockTx(address)
  const avgPsqm = Math.round(txns.reduce((s, tx) => s + tx.pricePerSqm, 0) / txns.length)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[#2C3B38] bg-[#172530] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C3B38] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#C8AA8F]/20 bg-[#C8AA8F]/10">
              <BarChart2 size={16} className="text-[#C8AA8F]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F0EDE8]">{cm.title}</h2>
              <p className="text-xs text-[#86968B]">
                {city} · {cm.source}
                <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                  {t.dir === 'rtl' ? 'הדגמה' : 'Demo'}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#86968B] transition-colors hover:text-[#F0EDE8]">
            <X size={18} />
          </button>
        </div>

        {/* Explanation tooltip */}
        <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-blue-500/15 bg-blue-500/8 p-3">
          <Info size={13} className="mt-0.5 shrink-0 text-blue-400" />
          <p className="text-xs leading-relaxed text-[#86968B]">{cm.explanation}</p>
        </div>

        {/* Transactions table */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2C3B38]">
                {[cm.tableDate, cm.tableAddress, cm.tableSqm, cm.tablePrice, cm.tablePricePerSqm].map((h) => (
                  <th key={h} className="pb-2 pr-3 text-right text-[10px] font-semibold uppercase tracking-widest text-[#445147] last:pr-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C3B38]/40">
              {txns.map((tx, i) => (
                <tr key={i} className="transition-colors hover:bg-[#101A26]/40">
                  <td className="py-2.5 pr-3 text-xs text-[#86968B]" dir="ltr">{tx.date}</td>
                  <td className="py-2.5 pr-3 text-xs text-[#F0EDE8]">{tx.street}</td>
                  <td className="py-2.5 pr-3 text-xs text-[#86968B]">{tx.sqm}</td>
                  <td className="py-2.5 pr-3 text-xs font-medium text-[#F0EDE8]">{fmtILS(tx.price)}</td>
                  <td className="py-2.5 text-xs font-semibold text-[#C8AA8F]">{fmtILS(tx.pricePerSqm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between rounded-b-2xl border-t border-[#2C3B38] bg-[#101A26]/30 px-5 py-3">
          <span className="text-xs text-[#86968B]">{cm.avgPerSqm}</span>
          <span className="text-sm font-bold text-[#C8AA8F]">
            {fmtILS(avgPsqm)}&nbsp;{t.dir === 'rtl' ? 'למ"ר' : '/ sqm'}
          </span>
        </div>

      </div>
    </div>
  )
}
