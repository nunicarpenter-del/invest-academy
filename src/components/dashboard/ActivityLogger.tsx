'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Fires a page_view event to /api/activity on every route change.
 * Renders nothing — purely for side effects.
 */
export default function ActivityLogger() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname

    fetch('/api/activity', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ event_type: 'page_view', page: pathname }),
    }).catch(() => {})
  }, [pathname])

  return null
}
