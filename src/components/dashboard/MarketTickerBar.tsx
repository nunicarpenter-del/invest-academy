'use client'

import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/contexts/LanguageContext'

interface WatchlistItem {
  symbol: string
  display_name: string
  exchange: string | null
}

interface Props {
  watchlistItems: WatchlistItem[]
}

const TABS_HE = ['מדדים', 'הרשימה שלי', 'מובילים', 'סחורות']
const TABS_EN = ['Indices', 'My Watchlist', 'Leaders', 'Commodities']

const INDICES_SYMBOLS = [
  { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
  { proName: 'NASDAQ:QQQ',      title: 'Nasdaq 100' },
  { proName: 'TASE:TA125',      title: 'TA-125' },
  { proName: 'INDEX:DAX',       title: 'DAX' },
  { proName: 'FOREXCOM:UKXUSD', title: 'FTSE 100' },
  { proName: 'FX:USDILS',       title: 'USD/ILS' },
  { proName: 'TVC:DXY',         title: 'DXY' },
]

const LEADERS_SYMBOLS = [
  { proName: 'NASDAQ:AAPL',  title: 'Apple' },
  { proName: 'NASDAQ:NVDA',  title: 'NVIDIA' },
  { proName: 'NASDAQ:TSLA',  title: 'Tesla' },
  { proName: 'NASDAQ:MSFT',  title: 'Microsoft' },
  { proName: 'NASDAQ:META',  title: 'Meta' },
  { proName: 'NASDAQ:AMZN',  title: 'Amazon' },
  { proName: 'NASDAQ:GOOGL', title: 'Alphabet' },
  { proName: 'TASE:TEVA',    title: 'Teva' },
  { proName: 'TASE:LUMI',    title: 'Bank Leumi' },
  { proName: 'TASE:ESLT',    title: 'Elbit' },
]

const COMMODITIES_SYMBOLS = [
  { proName: 'TVC:GOLD',        title: 'Gold' },
  { proName: 'TVC:SILVER',      title: 'Silver' },
  { proName: 'USOIL',           title: 'Crude Oil' },
  { proName: 'TVC:NATURALGAS',  title: 'Nat. Gas' },
  { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
  { proName: 'BITSTAMP:ETHUSD', title: 'Ethereum' },
]

// Convert yahoo symbol to TradingView proName
function toTVProName(symbol: string, exchange: string | null): string {
  if (!exchange) {
    if (symbol.endsWith('-USD')) return `CRYPTO:${symbol.replace('-USD', '')}USD`
    if (symbol.endsWith('.TA')) return `TASE:${symbol.replace('.TA', '')}`
    return `NASDAQ:${symbol}`
  }
  const ex = exchange.toUpperCase()
  if (ex === 'TASE' || ex === 'TLV') return `TASE:${symbol.replace('.TA', '')}`
  return `${ex}:${symbol}`
}

function TickerWidget({ symbols, widgetKey }: { symbols: { proName: string; title: string }[]; widgetKey: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    container.innerHTML = ''

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols,
      showSymbolLogo:  true,
      isTransparent:   true,
      displayMode:     'adaptive',
      colorTheme:      'dark',
      locale:          'en',
    })
    container.appendChild(script)
  }, [widgetKey]) // remount when tab key changes

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{ height: 46 }}
    />
  )
}

export default function MarketTickerBar({ watchlistItems }: Props) {
  const { lang } = useLang()
  const [activeTab, setActiveTab] = useState(0)

  const tabs = lang === 'he' ? TABS_HE : TABS_EN

  const watchlistSymbols = watchlistItems.map((item) => ({
    proName: toTVProName(item.symbol, item.exchange),
    title:   item.display_name || item.symbol,
  }))

  const symbolsByTab = [
    INDICES_SYMBOLS,
    watchlistSymbols,
    LEADERS_SYMBOLS,
    COMMODITIES_SYMBOLS,
  ]

  const currentSymbols = symbolsByTab[activeTab]
  const widgetKey = `${activeTab}-${currentSymbols.map(s => s.proName).join(',')}`

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2C3B38] bg-[#172530]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[#2C3B38] px-3 pt-2 gap-1">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`
              px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-all border-b-2
              ${activeTab === i
                ? 'border-[#C8AA8F] text-[#C8AA8F] bg-[#C8AA8F]/8'
                : 'border-transparent text-[#86968B] hover:text-[#F0EDE8]'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Ticker tape or empty state */}
      {currentSymbols.length > 0 ? (
        <TickerWidget symbols={currentSymbols} widgetKey={widgetKey} />
      ) : (
        <div className="flex h-[46px] items-center justify-center px-4">
          <p className="text-xs text-[#445147]">
            {lang === 'he'
              ? 'הוסף נכסים לרשימת המעקב כדי לראות אותם כאן'
              : 'Add assets to your watchlist to see them here'}
          </p>
        </div>
      )}
    </div>
  )
}
