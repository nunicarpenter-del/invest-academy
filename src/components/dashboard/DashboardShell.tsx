'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Image from 'next/image'
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

function ShellInner({ children, userName, userRole }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useLang()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={userName}
        userRole={userRole}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3.5 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={t.openMenu}
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
              <Image src="/logo.svg" alt="לוגו" width={18} height={18} />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">{t.brand.mobile}</span>
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

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ShellInner {...props} />
      </LanguageProvider>
    </ThemeProvider>
  )
}
