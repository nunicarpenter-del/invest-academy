import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvestmentsClient from '@/components/dashboard/InvestmentsClient'

// Fetch live price from Yahoo Finance with 5-minute Next.js data cache.
// Normalises ILA (Israeli Agorot = 1/100 shekel) → ILS automatically.
async function fetchLivePrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // 5-minute server-side cache
    })
    if (!res.ok) return null
    const data        = await res.json()
    const result      = data?.quoteResponse?.result?.[0]
    if (!result?.regularMarketPrice) return null

    const rawPrice    = result.regularMarketPrice as number
    const rawCurrency = (result.currency as string) ?? 'USD'

    // Yahoo Finance returns ILA (Agorot) for .TA stocks — convert to ILS
    const price    = rawCurrency === 'ILA' ? rawPrice / 100 : rawPrice
    const currency = rawCurrency === 'ILA' ? 'ILS'          : rawCurrency

    return { price, currency }
  } catch {
    return null
  }
}

export default async function InvestmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: investments },
    { data: watchlistRows },
    { data: alertRows },
  ] = await Promise.all([
    supabase
      .from('investments')
      .select('id, name, symbol, asset_type, quantity, purchase_price, current_price, currency, notes, purchase_date, sector, exchange, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('watchlist')
      .select('id, symbol, display_name, exchange, asset_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('price_alerts')
      .select('id, symbol, display_name, condition, target_price, currency, is_triggered')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const rows = investments ?? []

  // Collect unique non-empty symbols (investments + watchlist)
  const investSymbols = rows.filter((i) => i.symbol).map((i) => i.symbol!)
  const watchSymbols  = (watchlistRows ?? []).map((w) => w.symbol)
  const allSymbols    = [...new Set([...investSymbols, ...watchSymbols])]

  const livePrices: Record<string, { price: number; currency: string } | null> = {}
  await Promise.allSettled(
    allSymbols.map(async (symbol) => {
      livePrices[symbol] = await fetchLivePrice(symbol)
    })
  )

  // Attach live_price and normalised currency to each investment row
  const enriched = rows.map((i) => {
    const live = i.symbol ? (livePrices[i.symbol] ?? null) : null
    return {
      ...i,
      live_price:      live?.price    ?? null,
      live_currency:   live?.currency ?? null,
    }
  })

  // Enrich watchlist with live prices
  const watchlistItems = (watchlistRows ?? []).map((w) => ({
    ...w,
    live_price:    livePrices[w.symbol]?.price    ?? null,
    live_currency: livePrices[w.symbol]?.currency ?? null,
  }))

  return (
    <InvestmentsClient
      investments={enriched}
      watchlistItems={watchlistItems}
      priceAlerts={alertRows ?? []}
    />
  )
}
