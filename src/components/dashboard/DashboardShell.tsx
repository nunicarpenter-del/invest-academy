'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { LanguageProvider, useLang } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import LanguageToggle from '@/components/LanguageToggle'
import ThemeToggle from '@/components/ThemeToggle'
import ActivityLogger from '@/components/dashboard/ActivityLogger'

interface DashboardShellProps {
  children: React.ReactNode
  userName: string
  userRole: string
}

// Inner shell that can consume the language context
function ShellInner({ children, userName, userRole }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLang()

  return (
    <div className="flex h-screen overflow-hidden bg-[#101A26]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={userName}
        userRole={userRole}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-[#2C3B38] bg-[#172530] px-4 py-3.5 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#86968B] transition-colors hover:text-[#F0EDE8]"
            aria-label={t.openMenu}
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C8AA8F]/30 bg-[#C8AA8F]/8">
              <span className="text-[10px] font-bold tracking-widest text-[#C8AA8F]">IA</span>
            </div>
            <span className="text-sm font-semibold text-[#F0EDE8]">{t.brand.mobile}</span>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <ActivityLogger />
          {children}
        </main>
      </div>
    </div>
  )
}

// Outer shell provides the context — this is what the layout renders
export default function DashboardShell(props: DashboardShellProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ShellInner {...props} />
      </LanguageProvider>
    </ThemeProvider>
  )
}
