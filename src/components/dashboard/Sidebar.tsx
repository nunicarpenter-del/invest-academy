'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, PieChart, Wallet,
  CalendarDays, GraduationCap, Home, LogOut, X, Landmark, Banknote, Shield,
} from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'
import ThemeToggle from '@/components/ThemeToggle'

const NAV_KEYS = ['dashboard', 'properties', 'portfolio', 'cashflow', 'pension', 'insurance', 'mortgages', 'meetings', 'academy'] as const
const NAV_HREFS = ['/dashboard', '/dashboard/properties', '/dashboard/investments', '/dashboard/cashflow', '/dashboard/pension', '/dashboard/insurance', '/dashboard/mortgages', '/dashboard/meetings', '/dashboard/academy']
const NAV_ICONS = [LayoutDashboard, Home, PieChart, Wallet, Landmark, Shield, Banknote, CalendarDays, GraduationCap]

interface SidebarProps {
  open:     boolean
  onClose:  () => void
  userName: string
  userRole: string
}

export default function Sidebar({ open, onClose, userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { t }    = useLang()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed right-0 top-0 z-50 flex h-full w-64 flex-col
          border-l border-sidebar-border bg-sidebar
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
          md:relative md:right-auto md:translate-x-0 md:z-auto md:border-l
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
              <Image src="/logo.svg" alt="לוגו" width={22} height={22} />
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold text-sidebar-foreground">{t.brand.line1}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.brand.line2}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-sidebar-foreground md:hidden"
            aria-label={t.closeMenu}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_KEYS.map((key, i) => {
            const href   = NAV_HREFS[i]
            const Icon   = NAV_ICONS[i]
            const label  = t.nav[key]
            const isActive =
              pathname === href ||
              (href !== '/dashboard' && (pathname?.startsWith(`${href}/`) ?? false))
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 rounded-xl border-r-2 px-3 py-2.5
                  text-sm font-medium transition-all duration-150
                  ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }
                `}
              >
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer: user + theme + language + sign out */}
        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="rounded-xl bg-sidebar-accent px-3 py-2.5">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {userName || t.userFallback}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.roles[userRole] ?? userRole.replace(/_/g, ' ')}
            </p>
          </div>

          {/* Language + Theme row */}
          <div className="flex items-center justify-between rounded-xl border border-sidebar-border bg-background/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {t.nav.dashboard === 'Dashboard' ? 'Language' : 'שפה'}
            </span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut size={15} />
            {t.signOut}
          </button>
        </div>
      </aside>
    </>
  )
}
