'use client'

import { useEffect, useRef } from 'react'

export default function TickerTape() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // Clear any previous widget
    container.innerHTML = ''

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500'     },
        { proName: 'NASDAQ:QQQ',      title: 'Nasdaq 100'  },
        { proName: 'NASDAQ:AAPL',     title: 'Apple'       },
        { proName: 'NASDAQ:NVDA',     title: 'NVIDIA'      },
        { proName: 'NASDAQ:TSLA',     title: 'Tesla'       },
        { proName: 'NASDAQ:MSFT',     title: 'Microsoft'   },
        { proName: 'NASDAQ:META',     title: 'Meta'        },
        { proName: 'TASE:TEVA',       title: 'Teva'        },
        { proName: 'TASE:LUMI',       title: 'Bank Leumi'  },
        { proName: 'TASE:POLI',       title: 'Hapoalim'    },
        { proName: 'TASE:ESLT',       title: 'Elbit'       },
        { proName: 'FX:USDILS',       title: 'USD/ILS'     },
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin'     },
        { proName: 'BITSTAMP:ETHUSD', title: 'Ethereum'    },
      ],
      showSymbolLogo:  true,
      isTransparent:   true,
      displayMode:     'adaptive',
      colorTheme:      'dark',
      locale:          'en',
    })
    container.appendChild(script)
  }, [])

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2C3B38]">
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: 46 }}
      />
    </div>
  )
}
