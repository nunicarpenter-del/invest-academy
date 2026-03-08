'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { toTVSymbol } from '@/lib/symbols'

interface Props {
  symbol:   string   // raw symbol, e.g. "AAPL" or "LUMI.TA"
  name:     string   // display name
  onClose:  () => void
}

export default function TradingViewChart({ symbol, name, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tvSymbol     = toTVSymbol(symbol)

  // Load widget
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''

    const script = document.createElement('script')
    script.type  = 'text/javascript'
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:          true,
      symbol:            tvSymbol,
      interval:          'D',
      timezone:          'Asia/Jerusalem',
      theme:             'dark',
      style:             '1',
      locale:            'en',
      backgroundColor:   '#101A26',
      gridColor:         'rgba(44,59,56,0.4)',
      enable_publishing: false,
      hide_top_toolbar:  false,
      hide_legend:       false,
      save_image:        false,
      calendar:          false,
      support_host:      'https://www.tradingview.com',
    })
    container.appendChild(script)
  }, [tvSymbol])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative flex w-full max-w-5xl flex-col rounded-2xl border border-[#2C3B38] bg-[#101A26] shadow-2xl overflow-hidden"
        style={{ height: '75vh' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#2C3B38] bg-[#172530] px-5 py-3">
          <div>
            <span className="text-sm font-semibold text-[#F0EDE8]">{name}</span>
            <span className="ml-2 text-xs text-[#86968B]">{tvSymbol}</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#86968B] transition-colors hover:text-[#F0EDE8]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chart container */}
        <div ref={containerRef} className="flex-1 w-full" />
      </div>
    </div>
  )
}
