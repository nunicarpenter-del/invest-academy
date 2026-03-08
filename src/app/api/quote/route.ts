import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

// Singleton instance — created once, reused across requests
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.trim().toUpperCase()
  console.log('[/api/quote] symbol received:', symbol)

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  }

  try {
    console.log('[/api/quote] calling yahoo-finance2 for:', symbol)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yf.quote(symbol)
    console.log('[/api/quote] raw result:', {
      symbol: quote?.symbol,
      regularMarketPrice: quote?.regularMarketPrice,
      currency: quote?.currency,
    })

    if (!quote?.regularMarketPrice) {
      console.warn('[/api/quote] no regularMarketPrice for:', symbol)
      return NextResponse.json({ error: 'price not found for symbol' }, { status: 404 })
    }

    const rawPrice    = quote.regularMarketPrice as number
    const rawCurrency = (quote.currency as string) ?? 'USD'

    // Yahoo Finance returns Israeli .TA stocks in ILA (Agorot = 1/100 shekel).
    // Normalise to ILS so the UI shows the correct price.
    const price    = rawCurrency === 'ILA' ? rawPrice / 100 : rawPrice
    const currency = rawCurrency === 'ILA' ? 'ILS'          : rawCurrency

    console.log('[/api/quote] returning:', { symbol, price, currency })

    return NextResponse.json(
      {
        symbol:   quote.symbol as string,
        price,
        currency,
        name:     (quote.longName ?? quote.shortName ?? symbol) as string,
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    console.error('[/api/quote] error for', symbol, ':', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
