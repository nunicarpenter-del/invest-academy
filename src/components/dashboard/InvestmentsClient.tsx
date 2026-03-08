'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, TrendingUp, TrendingDown,
  Briefcase, DollarSign, Hash, Tag, FileText, ChevronDown,
  Calendar, Loader2, CheckCircle, AlertCircle, BarChart2,
  Coins, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import { searchSymbolsGrouped, type StockSymbol, CRYPTO_SYMBOLS } from '@/lib/symbols'
import MarketTickerBar from '@/components/dashboard/MarketTickerBar'
import TradingViewChart from '@/components/dashboard/TradingViewChart'
import dynamic from 'next/dynamic'

const InvestmentCharts = dynamic(() => import('./InvestmentCharts'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────────────
const ASSET_TYPES = ['stock', 'crypto', 'fund', 'bond', 'etf', 'other'] as const
type AssetType = typeof ASSET_TYPES[number]
type Currency  = 'ILS' | 'USD'

interface Investment {
  id:             string
  name:           string
  symbol:         string | null
  asset_type:     string
  quantity:       number
  purchase_price: number | null
  current_price:  number | null
  currency:       string
  notes:          string | null
  purchase_date:  string | null
  sector:         string | null
  exchange:       string | null
  created_at:     string
  live_price?:    number | null
  live_currency?: string | null
}

interface WatchlistItem {
  id:            string
  symbol:        string
  display_name:  string
  exchange:      string | null
  asset_type:    string
  live_price:    number | null
  live_currency: string | null
}

interface PriceAlert {
  id:           string
  symbol:       string
  display_name: string | null
  condition:    'above' | 'below'
  target_price: number
  currency:     string
  is_triggered: boolean
}

interface Props {
  investments:  Investment[]
  watchlistItems: WatchlistItem[]
  priceAlerts:  PriceAlert[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
const n = (v: number | null | undefined) => v ?? 0

const isCryptoSymbol = (symbol: string | null) =>
  symbol ? symbol.endsWith('-USD') : false

const effectivePrice = (inv: Investment) =>
  inv.live_price ?? inv.current_price ?? null

const effectiveCurrency = (inv: Investment) =>
  inv.live_currency ?? inv.currency

const positionValue = (inv: Investment) => {
  const ep = effectivePrice(inv)
  return ep != null ? ep * n(inv.quantity) : null
}

const calcYield = (inv: Investment): number | null => {
  const ep = effectivePrice(inv)
  const pp = inv.purchase_price
  if (ep == null || pp == null || pp === 0) return null
  return ((ep - pp) / pp) * 100
}

// Format price, optionally converting USD→ILS
const fmtPrice = (val: number, currency: string, ilsMode: boolean, rate: number) => {
  if (ilsMode && currency === 'USD') {
    const ils = val * rate
    return '₪' + ils.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const sym    = currency === 'USD' ? '$' : '₪'
  const locale = currency === 'USD' ? 'en-US' : 'he-IL'
  return sym + val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fmtDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const TYPE_COLORS: Record<string, string> = {
  stock:  'bg-blue-400/10   text-blue-400   border-blue-400/20',
  crypto: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  fund:   'bg-purple-400/10 text-purple-400 border-purple-400/20',
  bond:   'bg-cyan-400/10   text-cyan-400   border-cyan-400/20',
  etf:    'bg-teal-400/10   text-teal-400   border-teal-400/20',
  other:  'bg-[#2C3B38]/60  text-[#86968B]  border-[#2C3B38]',
}

const EXCHANGE_COLORS: Record<string, string> = {
  NASDAQ: 'bg-blue-400/10   text-blue-400',
  NYSE:   'bg-purple-400/10 text-purple-400',
  TASE:   'bg-[#C8AA8F]/10  text-[#C8AA8F]',
  CRYPTO: 'bg-orange-400/10 text-orange-400',
}

// ── Summary banner ─────────────────────────────────────────────────────────
function SummaryBar({
  investments, ilsMode, rate,
}: { investments: Investment[]; ilsMode: boolean; rate: number }) {
  const { t } = useLang()
  const inv = t.investments

  // Convert everything to ILS for totals when ilsMode is on
  const toIls = (val: number, cur: string) => cur === 'USD' && ilsMode ? val * rate : val

  const totalValue    = investments.reduce((s, i) => {
    const v = positionValue(i)
    return s + (v != null ? toIls(v, effectiveCurrency(i)) : 0)
  }, 0)
  const totalCost = investments.reduce((s, i) => {
    const c = n(i.purchase_price) * n(i.quantity)
    return s + toIls(c, i.currency)
  }, 0)
  const totalGainLoss = totalValue - totalCost
  const positions     = investments.length
  const currSym       = ilsMode ? '₪' : '$/'  + '₪'

  const items = [
    {
      label: inv.summary.totalValue,
      value: (ilsMode ? '₪' : '') + totalValue.toLocaleString(ilsMode ? 'he-IL' : 'en-US', { maximumFractionDigits: 0 }),
      color: 'text-[#C8AA8F]',
      icon:  Briefcase,
    },
    {
      label: inv.summary.positions,
      value: String(positions),
      color: 'text-[#F0EDE8]',
      icon:  Hash,
    },
    {
      label: inv.summary.gainLoss,
      value: (totalGainLoss >= 0 ? '+' : '') + (ilsMode ? '₪' : '$') + Math.abs(totalGainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 }),
      color: totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400',
      icon:  totalGainLoss >= 0 ? TrendingUp : TrendingDown,
    },
  ]
  void currSym

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

// ── Price-fetch state ──────────────────────────────────────────────────────
type PriceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found';   price: number; currency: string }
  | { status: 'error' }

// ── Empty form ─────────────────────────────────────────────────────────────
const SECTORS = [
  'Technology','Finance','Energy','Healthcare','Consumer','Industrial',
  'Communication','Materials','Real Estate','Utilities','Other',
]

const makeEmpty = () => ({
  name:          '',
  symbol:        '',
  asset_type:    'stock' as AssetType,
  quantity:      '',
  purchase_price:'',
  purchase_date: new Date().toISOString().slice(0, 10),
  currency:      'ILS' as Currency,
  sector:        '',
  exchange:      '',
  notes:         '',
})

// ── Main component ─────────────────────────────────────────────────────────
export default function InvestmentsClient({ investments: initial, watchlistItems: initialWatchlist, priceAlerts: initialAlerts }: Props) {
  const router  = useRouter()
  const { t, lang }   = useLang()
  const inv     = t.investments

  const [isPending, startTransition] = useTransition()
  const [modalMode, setModalMode]    = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId]    = useState<string | null>(null)
  const [error,     setError]        = useState<string | null>(null)
  const [form,      setForm]         = useState(makeEmpty())
  const [priceState, setPriceState]  = useState<PriceState>({ status: 'idle' })

  // ── Watchlist state ───────────────────────────────────────────────────────
  const [showWatchlist,   setShowWatchlist]   = useState(false)
  const [watchlistSymbol, setWatchlistSymbol] = useState('')
  const [watchlistName,   setWatchlistName]   = useState('')
  const [watchlistExch,   setWatchlistExch]   = useState('')
  const [wlSuggestions,   setWlSuggestions]   = useState<{ stocks: StockSymbol[]; crypto: StockSymbol[] }>({ stocks: [], crypto: [] })
  const [wlShowSugg,      setWlShowSugg]      = useState(false)
  const wlHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Alerts state ─────────────────────────────────────────────────────────
  const [showAlerts,    setShowAlerts]    = useState(false)
  const [alertSymbol,   setAlertSymbol]   = useState('')
  const [alertName,     setAlertName]     = useState('')
  const [alertCond,     setAlertCond]     = useState<'above' | 'below'>('above')
  const [alertPrice,    setAlertPrice]    = useState('')
  const [alertError,    setAlertError]    = useState<string | null>(null)
  const [wlError,       setWlError]       = useState<string | null>(null)

  // Autocomplete
  const [suggestions,     setSuggestions]     = useState<{ stocks: StockSymbol[]; crypto: StockSymbol[] }>({ stocks: [], crypto: [] })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Chart modal
  const [chartTarget, setChartTarget] = useState<{ symbol: string; name: string } | null>(null)

  // ILS toggle + live rate
  const [showInIls,   setShowInIls]   = useState(false)
  const [usdIlsRate,  setUsdIlsRate]  = useState(3.65)
  const [rateLoading, setRateLoading] = useState(false)

  // ── Fetch live USD/ILS rate ───────────────────────────────────────────────
  const refreshRate = useCallback(async () => {
    setRateLoading(true)
    try {
      const res  = await fetch('/api/quote?symbol=USDILS%3DX')  // USDILS=X
      const data = await res.json()
      if (res.ok && data.price) setUsdIlsRate(Number(data.price.toFixed(4)))
    } catch { /* keep existing rate */ }
    finally  { setRateLoading(false) }
  }, [])

  // ── Fetch live price for the symbol field ────────────────────────────────
  const fetchPrice = useCallback(async (symbol: string) => {
    const s = symbol.trim().toUpperCase()
    if (!s) { setPriceState({ status: 'idle' }); return }
    console.log('[fetchPrice] starting fetch for:', s)
    setPriceState({ status: 'loading' })
    try {
      const url = `/api/quote?symbol=${encodeURIComponent(s)}`
      console.log('[fetchPrice] GET', url)
      const res  = await fetch(url)
      const data = await res.json()
      console.log('[fetchPrice] response status:', res.status, 'body:', data)
      if (!res.ok) throw new Error(data?.error ?? 'not found')
      setPriceState({ status: 'found', price: data.price, currency: data.currency })
      setForm((f) => ({ ...f, currency: data.currency as Currency }))
    } catch (err) {
      console.error('[fetchPrice] error:', err)
      setPriceState({ status: 'error' })
    }
  }, [])

  // ── Autocomplete helpers ──────────────────────────────────────────────────
  const handleNameChange = (value: string) => {
    setForm((f) => ({ ...f, name: value }))
    const grouped = searchSymbolsGrouped(value, 6, 4)
    setSuggestions(grouped)
    setShowSuggestions((grouped.stocks.length > 0 || grouped.crypto.length > 0) && value.length > 0)
  }

  const selectSuggestion = (s: StockSymbol) => {
    console.log('[selectSuggestion] selected:', s.symbol, s.name, s.exchange)
    const isCrypto = s.exchange === 'CRYPTO'
    setForm((f) => ({
      ...f,
      name:       s.name,
      symbol:     s.symbol,
      currency:   s.currency,
      asset_type: isCrypto ? 'crypto' : f.asset_type,
      exchange:   s.exchange ?? '',
    }))
    setSuggestions({ stocks: [], crypto: [] })
    setShowSuggestions(false)
    setPriceState({ status: 'idle' })
    fetchPrice(s.symbol)
  }

  const handleNameBlur = () => {
    hideTimerRef.current = setTimeout(() => setShowSuggestions(false), 150)
  }

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setError(null); setForm(makeEmpty()); setPriceState({ status: 'idle' })
    setSuggestions({ stocks: [], crypto: [] }); setShowSuggestions(false)
    setEditingId(null); setModalMode('add')
  }

  const openEdit = (i: Investment) => {
    setError(null)
    setForm({
      name:          i.name,
      symbol:        i.symbol ?? '',
      asset_type:    i.asset_type as AssetType,
      quantity:      String(i.quantity),
      purchase_price:i.purchase_price != null ? String(i.purchase_price) : '',
      purchase_date: i.purchase_date ?? '',
      currency:      i.currency as Currency,
      sector:        i.sector ?? '',
      exchange:      i.exchange ?? '',
      notes:         i.notes ?? '',
    })
    setSuggestions({ stocks: [], crypto: [] }); setShowSuggestions(false)
    if (i.live_price != null) {
      setPriceState({ status: 'found', price: i.live_price, currency: effectiveCurrency(i) })
    } else {
      setPriceState({ status: 'idle' })
    }
    setEditingId(i.id); setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null); setEditingId(null); setError(null); setShowSuggestions(false)
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null)
    const supabase = createClient()

    const payload: Record<string, unknown> = {
      name:           form.name.trim(),
      symbol:         form.symbol.trim().toUpperCase() || null,
      asset_type:     form.asset_type,
      quantity:       parseFloat(form.quantity) || 0,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      purchase_date:  form.purchase_date || null,
      currency:       form.currency,
      sector:         form.sector.trim() || null,
      exchange:       form.exchange.trim().toUpperCase() || null,
      notes:          form.notes.trim() || null,
    }
    if (priceState.status === 'found') payload.current_price = priceState.price

    if (modalMode === 'add') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError(inv.form.notAuth); return }
      const { error: err } = await supabase.from('investments').insert({ ...payload, user_id: user.id })
      if (err) { setError(err.message); return }
    } else if (modalMode === 'edit' && editingId) {
      const { error: err } = await supabase.from('investments').update(payload).eq('id', editingId)
      if (err) { setError(err.message); return }
    }
    closeModal(); startTransition(() => router.refresh())
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editingId) return
    const supabase = createClient()
    const { error: err } = await supabase.from('investments').delete().eq('id', editingId)
    if (err) { setError(err.message); return }
    closeModal(); startTransition(() => router.refresh())
  }

  // ── Watchlist handlers ────────────────────────────────────────────────────
  const handleWlNameChange = (v: string) => {
    setWatchlistSymbol(v)
    const grouped = searchSymbolsGrouped(v, 5, 3)
    setWlSuggestions(grouped)
    setWlShowSugg((grouped.stocks.length > 0 || grouped.crypto.length > 0) && v.length > 0)
  }
  const selectWlSuggestion = (s: StockSymbol) => {
    setWatchlistSymbol(s.symbol)
    setWatchlistName(s.name)
    setWatchlistExch(s.exchange ?? '')
    setWlSuggestions({ stocks: [], crypto: [] })
    setWlShowSugg(false)
  }
  const addToWatchlist = async () => {
    const sym = watchlistSymbol.trim().toUpperCase()
    if (!sym) return
    setWlError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase.from('watchlist').insert({
      user_id:      user.id,
      symbol:       sym,
      display_name: watchlistName || sym,
      exchange:     watchlistExch || null,
      asset_type:   'stock',
    })
    if (err) { setWlError(err.message); return }
    setWatchlistSymbol(''); setWatchlistName(''); setWatchlistExch('')
    startTransition(() => router.refresh())
  }
  const removeFromWatchlist = async (id: string) => {
    const supabase = createClient()
    await supabase.from('watchlist').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  // ── Alert handlers ────────────────────────────────────────────────────────
  const addAlert = async () => {
    const sym = alertSymbol.trim().toUpperCase()
    if (!sym || !alertPrice) return
    setAlertError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase.from('price_alerts').insert({
      user_id:      user.id,
      symbol:       sym,
      display_name: alertName || sym,
      condition:    alertCond,
      target_price: parseFloat(alertPrice),
      currency:     'ILS',
    })
    if (err) { setAlertError(err.message); return }
    setAlertSymbol(''); setAlertName(''); setAlertPrice('')
    startTransition(() => router.refresh())
  }
  const deleteAlert = async (id: string) => {
    const supabase = createClient()
    await supabase.from('price_alerts').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  // ── Shared field helpers ──────────────────────────────────────────────────
  const baseCls = 'w-full rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-4 pl-10 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-colors focus:border-[#C8AA8F]/50 focus:ring-1 focus:ring-[#C8AA8F]/20'
  const selCls  = 'w-full appearance-none rounded-xl border border-[#2C3B38] bg-[#101A26] py-2.5 pr-8 pl-10 text-sm text-[#F0EDE8] outline-none cursor-pointer transition-colors focus:border-[#C8AA8F]/50'

  const wrap = (icon: React.ReactNode, child: React.ReactNode) => (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">{icon}</span>
      {child}
    </div>
  )
  const lbl = (text: string) => (
    <label className="mb-1.5 block text-xs font-semibold tracking-widest text-[#86968B]">{text}</label>
  )

  const TABLE_HEADERS = [
    inv.table.name, inv.table.type, inv.table.purchaseDate,
    inv.table.qty, inv.table.buyPrice, inv.table.curPrice,
    inv.table.value, inv.table.yield, '',
  ]

  // Helper: is this investment in USD?
  const rowCurrency = (i: Investment) => effectiveCurrency(i)

  return (
    <div className="space-y-8 p-6 lg:p-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-widest text-[#445147]">{inv.section}</p>
          <h1 className="text-2xl font-semibold text-[#F0EDE8]">{inv.title}</h1>
          <p className="mt-1 text-sm text-[#86968B]">
            {initial.length === 0
              ? inv.subtitleEmpty
              : initial.length === 1 ? inv.subtitleSingular : inv.subtitlePlural(initial.length)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* ILS toggle + live rate */}
          <div className="flex items-center gap-2">
            {showInIls && (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#2C3B38] bg-[#101A26]/60 px-3 py-1.5">
                <span className="text-xs text-[#86968B]">$1 =</span>
                <input
                  type="number"
                  step="0.0001"
                  value={usdIlsRate}
                  onChange={(e) => setUsdIlsRate(parseFloat(e.target.value) || 3.65)}
                  className="w-16 bg-transparent text-xs font-mono font-semibold text-[#F0EDE8] outline-none"
                />
                <span className="text-xs text-[#86968B]">₪</span>
                <button
                  onClick={refreshRate}
                  disabled={rateLoading}
                  className="text-[#445147] transition-colors hover:text-[#C8AA8F] disabled:opacity-40"
                  title="Refresh live rate"
                >
                  <RefreshCw size={12} className={rateLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowInIls((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                showInIls
                  ? 'border-[#C8AA8F]/40 bg-[#C8AA8F]/15 text-[#C8AA8F]'
                  : 'border-[#2C3B38] text-[#86968B] hover:text-[#F0EDE8]'
              }`}
            >
              ₪ ILS
            </button>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 px-4 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50"
          >
            <Plus size={16} />{inv.addButton}
          </button>
        </div>
      </div>

      {/* ── Market Ticker Bar (4-tab) ── */}
      <MarketTickerBar watchlistItems={initialWatchlist} />

      {/* ── Summary ── */}
      {initial.length > 0 && (
        <SummaryBar investments={initial} ilsMode={showInIls} rate={usdIlsRate} />
      )}

      {/* ── Portfolio Analysis Charts ── */}
      {initial.length > 0 && (
        <InvestmentCharts investments={initial} ilsMode={showInIls} usdRate={usdIlsRate} />
      )}

      {/* ── Watchlist Panel ── */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#172530]">
        <button
          onClick={() => setShowWatchlist((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C8AA8F]/15 bg-[#C8AA8F]/8">
              <BarChart2 size={14} className="text-[#C8AA8F]" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#F0EDE8]">{inv.watchlist.title}</p>
              <p className="text-xs text-[#86968B]">{initialWatchlist.length} {lang === 'he' ? 'נכסים' : 'assets'}</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-[#86968B] transition-transform ${showWatchlist ? 'rotate-180' : ''}`} />
        </button>

        {showWatchlist && (
          <div className="border-t border-[#2C3B38] px-5 pb-5 pt-4 space-y-4">
            {/* Add to watchlist */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={watchlistSymbol}
                  onChange={(e) => handleWlNameChange(e.target.value)}
                  onBlur={() => { wlHideRef.current = setTimeout(() => setWlShowSugg(false), 150) }}
                  placeholder={inv.watchlist.symbolPlaceholder}
                  dir="auto"
                  className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] py-2 px-3 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/50"
                />
                {wlShowSugg && (
                  <div className="absolute top-full z-30 mt-1 w-full rounded-xl border border-[#2C3B38] bg-[#172530] shadow-xl">
                    {[...wlSuggestions.stocks, ...wlSuggestions.crypto].slice(0, 6).map((s) => (
                      <div
                        key={s.symbol}
                        onMouseDown={() => selectWlSuggestion(s)}
                        className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs hover:bg-[#2C3B38]/50"
                      >
                        <span className="font-semibold text-[#F0EDE8]">{s.symbol}</span>
                        <span className="text-[#86968B]">{s.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={addToWatchlist}
                disabled={!watchlistSymbol.trim() || isPending}
                className="flex items-center gap-1.5 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 px-3 py-2 text-xs font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 disabled:opacity-40"
              >
                <Plus size={14} />{inv.watchlist.add}
              </button>
            </div>
            {wlError && <p className="text-xs text-red-400">{wlError}</p>}

            {/* Watchlist items */}
            {initialWatchlist.length === 0 ? (
              <p className="text-center text-xs text-[#445147]">{inv.watchlist.empty}</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {initialWatchlist.map((item) => {
                  const lp = item.live_price
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#F0EDE8]">{item.symbol}</p>
                        <p className="text-[10px] text-[#86968B]">{item.display_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lp != null && (
                          <span className="text-xs font-semibold text-emerald-400">
                            ₪{lp.toLocaleString('he-IL', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                        <button
                          onClick={() => removeFromWatchlist(item.id)}
                          className="text-[#445147] transition-colors hover:text-red-400"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Price Alerts Panel ── */}
      <div className="rounded-2xl border border-[#2C3B38] bg-[#172530]">
        <button
          onClick={() => setShowAlerts((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C8AA8F]/15 bg-[#C8AA8F]/8">
              <AlertCircle size={14} className="text-[#C8AA8F]" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#F0EDE8]">{inv.alerts.title}</p>
              <p className="text-xs text-[#86968B]">{initialAlerts.length} {lang === 'he' ? 'התראות' : 'alerts'}</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-[#86968B] transition-transform ${showAlerts ? 'rotate-180' : ''}`} />
        </button>

        {showAlerts && (
          <div className="border-t border-[#2C3B38] px-5 pb-5 pt-4 space-y-4">
            {/* Add alert form */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input
                type="text"
                value={alertSymbol}
                onChange={(e) => {
                  setAlertSymbol(e.target.value.toUpperCase())
                  setAlertName(e.target.value.toUpperCase())
                }}
                placeholder={lang === 'he' ? 'סמל (AAPL)' : 'Symbol (AAPL)'}
                className="rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/50"
              />
              <div className="flex rounded-xl border border-[#2C3B38] bg-[#101A26] p-1">
                {(['above', 'below'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAlertCond(c)}
                    className={`flex-1 rounded-lg py-1 text-xs font-semibold transition-all ${alertCond === c ? 'bg-[#C8AA8F]/15 text-[#C8AA8F]' : 'text-[#86968B]'}`}
                  >
                    {c === 'above' ? inv.alerts.above : inv.alerts.below}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                placeholder={inv.alerts.targetPrice}
                className="rounded-xl border border-[#2C3B38] bg-[#101A26] px-3 py-2 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none focus:border-[#C8AA8F]/50"
              />
              <button
                onClick={addAlert}
                disabled={!alertSymbol.trim() || !alertPrice || isPending}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 px-3 py-2 text-xs font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 disabled:opacity-40"
              >
                <Plus size={14} />{inv.alerts.add}
              </button>
            </div>
            {alertError && <p className="text-xs text-red-400">{alertError}</p>}

            {/* Alerts list */}
            {initialAlerts.length === 0 ? (
              <p className="text-center text-xs text-[#445147]">{inv.alerts.empty}</p>
            ) : (
              <div className="space-y-2">
                {initialAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                      alert.is_triggered
                        ? 'border-[#C8AA8F]/30 bg-[#C8AA8F]/8'
                        : 'border-[#2C3B38] bg-[#101A26]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#F0EDE8]">{alert.symbol}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        alert.condition === 'above'
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : 'bg-red-400/10 text-red-400'
                      }`}>
                        {alert.condition === 'above' ? '▲' : '▼'} ₪{alert.target_price.toLocaleString('he-IL')}
                      </span>
                      {alert.is_triggered && (
                        <span className="text-[10px] font-semibold text-[#C8AA8F]">{inv.alerts.triggered}</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-[#445147] transition-colors hover:text-red-400"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {initial.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2C3B38] bg-[#172530]/50 py-20 text-center">
          <Briefcase size={36} className="mb-4 text-[#445147]" />
          <p className="text-sm font-medium text-[#86968B]">{inv.emptyTitle}</p>
          <p className="mt-1 text-xs text-[#445147]">{inv.emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#2C3B38]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2C3B38] bg-[#172530]">
                  {TABLE_HEADERS.map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-right text-xs font-semibold tracking-widest text-[#445147]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C3B38] bg-[#101A26]">
                {initial.map((i) => {
                  const val      = positionValue(i)
                  const yld      = calcYield(i)
                  const ep       = effectivePrice(i)
                  const cur      = rowCurrency(i)
                  const isLive   = i.live_price != null
                  const isCrypto = isCryptoSymbol(i.symbol) || i.asset_type === 'crypto'

                  return (
                    <tr
                      key={i.id}
                      className="cursor-pointer transition-colors hover:bg-[#172530]/70"
                      onClick={() => i.symbol && setChartTarget({ symbol: i.symbol, name: i.name })}
                    >
                      {/* Asset name + symbol */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isCrypto
                              ? 'border-orange-400/20 bg-orange-400/8'
                              : 'border-[#C8AA8F]/15 bg-[#C8AA8F]/8'
                          }`}>
                            {isCrypto
                              ? <Coins size={14} className="text-orange-400" />
                              : <BarChart2 size={14} className="text-[#C8AA8F]" />}
                          </div>
                          <div>
                            <p dir="auto" className="font-medium text-[#F0EDE8]">{i.name}</p>
                            {i.symbol && (
                              <p className={`text-xs tracking-wider ${isCrypto ? 'text-orange-400/70' : 'text-[#86968B]'}`}>
                                {i.symbol}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type badge */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[i.asset_type] ?? TYPE_COLORS.other}`}>
                          {isCrypto && <Coins size={10} />}
                          {inv.types[i.asset_type] ?? i.asset_type}
                        </span>
                      </td>

                      {/* Purchase date */}
                      <td className="px-5 py-4 text-sm text-[#86968B]">{fmtDate(i.purchase_date)}</td>

                      {/* Quantity */}
                      <td className="px-5 py-4 font-medium text-[#F0EDE8]">
                        {n(i.quantity).toLocaleString('en-US', { maximumFractionDigits: 8 })}
                      </td>

                      {/* Buy price */}
                      <td className="px-5 py-4 text-[#F0EDE8]">
                        {i.purchase_price != null
                          ? fmtPrice(i.purchase_price, i.currency, showInIls, usdIlsRate)
                          : <span className="text-[#445147]">—</span>}
                      </td>

                      {/* Live price */}
                      <td className="px-5 py-4">
                        {ep != null ? (
                          <div className="flex items-center gap-1.5">
                            <span className={isLive ? 'text-[#F0EDE8] font-medium' : 'text-[#86968B]'}>
                              {fmtPrice(ep, cur, showInIls, usdIlsRate)}
                            </span>
                            {isLive && (
                              <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 leading-none">
                                LIVE
                              </span>
                            )}
                          </div>
                        ) : <span className="text-[#445147]">—</span>}
                      </td>

                      {/* Total value */}
                      <td className="px-5 py-4 font-semibold text-[#C8AA8F]">
                        {val != null
                          ? fmtPrice(val, cur, showInIls, usdIlsRate)
                          : <span className="text-[#445147]">—</span>}
                      </td>

                      {/* Yield % */}
                      <td className="px-5 py-4">
                        {yld != null ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            yld >= 0
                              ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                              : 'text-red-400 bg-red-400/10 border border-red-400/20'
                          }`}>
                            {yld >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {yld >= 0 ? '+' : ''}{yld.toFixed(1)}%
                          </span>
                        ) : <span className="text-[#445147]">—</span>}
                      </td>

                      {/* Edit */}
                      <td className="px-5 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(i) }}
                          className="flex items-center gap-1.5 rounded-xl border border-[#C8AA8F]/25 bg-[#C8AA8F]/8 px-3 py-1.5 text-xs font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/18 hover:border-[#C8AA8F]/45"
                        >
                          {inv.form.editButton}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TradingView Chart Modal ── */}
      {chartTarget && (
        <TradingViewChart
          symbol={chartTarget.symbol}
          name={chartTarget.name}
          onClose={() => setChartTarget(null)}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-[#2C3B38] bg-[#172530] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F0EDE8]">
                {modalMode === 'add' ? inv.form.title : inv.form.editTitle}
              </h2>
              <button onClick={closeModal} className="text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">

              {/* Name (autocomplete) + Symbol */}
              <div className="grid grid-cols-2 gap-4">

                {/* Name field */}
                <div className="relative">
                  {lbl(inv.form.name)}
                  {wrap(
                    <Briefcase size={14} />,
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      placeholder={inv.form.namePlaceholder}
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onBlur={handleNameBlur}
                      onFocus={() => {
                        if (form.name.length > 0) {
                          const grouped = searchSymbolsGrouped(form.name, 6, 4)
                          setSuggestions(grouped)
                          setShowSuggestions(grouped.stocks.length > 0 || grouped.crypto.length > 0)
                        }
                      }}
                      className={baseCls}
                    />
                  )}

                  {/* Grouped suggestions dropdown */}
                  {showSuggestions && (suggestions.stocks.length > 0 || suggestions.crypto.length > 0) && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#2C3B38] bg-[#172530] shadow-2xl">

                      {/* Stocks section */}
                      {suggestions.stocks.length > 0 && (
                        <>
                          <div className="flex items-center gap-1.5 border-b border-[#2C3B38]/60 bg-[#101A26]/60 px-3 py-1.5">
                            <BarChart2 size={11} className="text-[#86968B]" />
                            <span className="text-[10px] font-bold tracking-widest text-[#445147]">STOCKS & ETFs</span>
                          </div>
                          {suggestions.stocks.map((s) => (
                            <div
                              key={s.symbol}
                              onMouseDown={() => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); selectSuggestion(s) }}
                              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-[#2C3B38]/60"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-[#F0EDE8]">{s.name}</p>
                                <p className="text-[11px] text-[#86968B]">{s.symbol}</p>
                              </div>
                              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${EXCHANGE_COLORS[s.exchange] ?? ''}`}>
                                {s.exchange}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Crypto section */}
                      {suggestions.crypto.length > 0 && (
                        <>
                          <div className={`flex items-center gap-1.5 border-b border-[#2C3B38]/60 px-3 py-1.5 ${suggestions.stocks.length > 0 ? 'border-t bg-[#101A26]/60' : 'bg-orange-400/5'}`}>
                            <Coins size={11} className="text-orange-400" />
                            <span className="text-[10px] font-bold tracking-widest text-orange-400/70">CRYPTO</span>
                          </div>
                          {suggestions.crypto.map((s) => (
                            <div
                              key={s.symbol}
                              onMouseDown={() => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); selectSuggestion(s) }}
                              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-orange-400/5"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Coins size={12} className="shrink-0 text-orange-400/60" />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-[#F0EDE8]">{s.name}</p>
                                  <p className="text-[11px] text-orange-400/60">{s.symbol}</p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-md bg-orange-400/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">
                                CRYPTO
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Quick browse all crypto shortcut */}
                      {suggestions.crypto.length === 0 && suggestions.stocks.length > 0 && (
                        <div className="border-t border-[#2C3B38]/60 bg-[#101A26]/40 px-3 py-2">
                          <button
                            type="button"
                            onMouseDown={() => {
                              if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
                              const top = CRYPTO_SYMBOLS.slice(0, 8)
                              setSuggestions({ stocks: [], crypto: top })
                            }}
                            className="flex items-center gap-1.5 text-[11px] text-[#445147] transition-colors hover:text-orange-400"
                          >
                            <Coins size={11} /> Browse top crypto
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Symbol field */}
                <div>
                  {lbl(inv.form.symbol)}
                  {wrap(
                    <Tag size={14} />,
                    <input
                      type="text"
                      placeholder={inv.form.symbolPlaceholder}
                      value={form.symbol}
                      onChange={(e) => { setForm((f) => ({ ...f, symbol: e.target.value })); setPriceState({ status: 'idle' }) }}
                      onBlur={(e) => fetchPrice(e.target.value)}
                      className={baseCls}
                    />
                  )}
                  <div className="mt-1.5 min-h-[18px]">
                    {priceState.status === 'loading' && (
                      <p className="flex items-center gap-1 text-xs text-[#86968B]">
                        <Loader2 size={11} className="animate-spin" />{inv.form.fetchingPrice}
                      </p>
                    )}
                    {priceState.status === 'found' && (
                      <p className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle size={11} />
                        {inv.form.priceFound}{' '}
                        <span className="font-bold">
                          {priceState.currency === 'USD' ? '$' : '₪'}
                          {priceState.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[#445147]">({priceState.currency})</span>
                      </p>
                    )}
                    {priceState.status === 'error' && (
                      <p className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle size={11} />{inv.form.priceError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Type + Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {lbl(inv.form.type)}
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]">
                      {form.asset_type === 'crypto' ? <Coins size={14} /> : <ChevronDown size={14} />}
                    </span>
                    <select
                      value={form.asset_type}
                      onChange={(e) => setForm((f) => ({ ...f, asset_type: e.target.value as AssetType }))}
                      className={`${selCls} ${form.asset_type === 'crypto' ? 'text-orange-400' : ''}`}
                    >
                      {ASSET_TYPES.map((v) => (
                        <option key={v} value={v} className="bg-[#172530]">{inv.types[v] ?? v}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#445147]"><ChevronDown size={13} /></span>
                  </div>
                </div>

                <div>
                  {lbl(inv.form.currency)}
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><DollarSign size={14} /></span>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
                      className={selCls}
                    >
                      <option value="ILS" className="bg-[#172530]">₪ ILS</option>
                      <option value="USD" className="bg-[#172530]">$ USD</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#445147]"><ChevronDown size={13} /></span>
                  </div>
                </div>
              </div>

              {/* Quantity + Buy Price + Purchase Date */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  {lbl(inv.form.qty)}
                  {wrap(<Hash size={14} />,
                    <input type="number" min="0" step="any" placeholder="0" value={form.quantity}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className={baseCls} />
                  )}
                </div>
                <div>
                  {lbl(inv.form.buyPrice)}
                  {wrap(<DollarSign size={14} />,
                    <input type="number" min="0" step="any" placeholder="0" value={form.purchase_price}
                      onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))} className={baseCls} />
                  )}
                </div>
                <div>
                  {lbl(inv.form.purchaseDate)}
                  {wrap(<Calendar size={14} />,
                    <input type="date" value={form.purchase_date}
                      onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))} className={baseCls} />
                  )}
                </div>
              </div>

              {/* Sector */}
              <div>
                {lbl(t.dir === 'rtl' ? 'סקטור' : 'Sector')}
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#445147]"><ChevronDown size={14} /></span>
                  <select
                    value={form.sector}
                    onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                    className={selCls}
                  >
                    <option value="" className="bg-[#172530]">{t.dir === 'rtl' ? 'בחר סקטור' : 'Select sector'}</option>
                    {SECTORS.map((s) => (
                      <option key={s} value={s} className="bg-[#172530]">{s}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#445147]"><ChevronDown size={13} /></span>
                </div>
              </div>

              {/* Notes */}
              <div>
                {lbl(inv.form.notes)}
                {wrap(<FileText size={14} />,
                  <input type="text" value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={baseCls} />
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                {modalMode === 'edit' && (
                  <button type="button" onClick={handleDelete} disabled={isPending}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50">
                    {inv.form.delete}
                  </button>
                )}
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-xl border border-[#2C3B38] py-2.5 text-sm font-medium text-[#86968B] transition-colors hover:text-[#F0EDE8]">
                  {inv.form.cancel}
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/10 py-2.5 text-sm font-semibold text-[#C8AA8F] transition-all hover:bg-[#C8AA8F]/20 hover:border-[#C8AA8F]/50 disabled:opacity-50">
                  {isPending ? inv.form.saving : inv.form.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
