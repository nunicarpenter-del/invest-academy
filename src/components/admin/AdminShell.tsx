'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import AdminSidebar from './AdminSidebar'

export default function AdminShell({
  children,
  userName,
}: {
  children: React.ReactNode
  userName: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen flex-row-reverse bg-[#101A26]">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#2C3B38] bg-[#20302F] px-4 md:px-6" dir="rtl">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden -mr-1 rounded-lg p-2 text-[#86968B] transition-colors hover:bg-[#2C3B38] hover:text-[#F0EDE8]"
            aria-label="פתח תפריט"
          >
            <Menu size={20} />
          </button>

          <span className="text-xs text-[#445147]">מחובר כ</span>
          <span className="truncate text-xs font-medium text-[#C8AA8F]">{userName}</span>
          <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
            מנהל
          </span>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
