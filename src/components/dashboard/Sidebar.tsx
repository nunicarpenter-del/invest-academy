'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, PieChart, Wallet,
  CalendarDays, GraduationCap, Home, LogOut, X, Landmark, Banknote, Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed right-0 top-0 z-50 flex h-full w-64 flex-col
          border-l border-[#2C3B38] bg-[#172530]
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
          md:relative md:right-auto md:translate-x-0 md:z-auto md:border-l
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-[#2C3B38] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C8AA8F]/30 bg-[#C8AA8F]/8">
              <span className="text-sm font-bold tracking-widest text-[#C8AA8F]">IA</span>
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold text-[#F0EDE8]">{t.brand.line1}</p>
              <p className="mt-0.5 text-xs text-[#86968B]">{t.brand.line2}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#86968B] transition-colors hover:text-[#F0EDE8] md:hidden"
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
              (href !== '/dashboard' && pathname.startsWith(`${href}/`))
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
                      ? 'border-[#C8AA8F] bg-[#C8AA8F]/10 text-[#C8AA8F]'
                      : 'border-transparent text-[#86968B] hover:bg-[#2C3B38]/60 hover:text-[#F0EDE8]'
                  }
                `}
              >
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer: user + language toggle + sign out */}
        <div className="border-t border-[#2C3B38] p-4 space-y-2">
          <div className="rounded-xl bg-[#101A26]/70 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-[#F0EDE8]">
              {userName || t.userFallback}
            </p>
            <p className="text-xs text-[#86968B]">
              {t.roles[userRole] ?? userRole.replace(/_/g, ' ')}
            </p>
          </div>

          {/* Language toggle — full width row */}
          <div className="flex items-center justify-between rounded-xl border border-[#2C3B38] bg-[#101A26]/40 px-3 py-2">
            <span className="text-xs text-[#445147]">
              {/* small label so users know what it does */}
              {t.nav.dashboard === 'Dashboard' ? 'Language' : 'שפה'}
            </span>
            <LanguageToggle />
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#86968B] transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={15} />
            {t.signOut}
          </button>
        </div>
      </aside>
    </>
  )
}
