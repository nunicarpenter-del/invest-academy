'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users2, Film, FolderTree, ShieldCheck, Briefcase, ChevronRight, X } from 'lucide-react'

const NAV = [
  { key: 'overview',   href: '/admin',            label: 'סקירה כללית',      icon: LayoutDashboard, exact: true },
  { key: 'users',      href: '/admin/users',      label: 'ניהול משתמשים',    icon: Users2 },
  { key: 'vod',        href: '/admin/vod',        label: 'ניהול תוכן',       icon: Film },
  { key: 'categories', href: '/admin/categories', label: 'ניהול קטגוריות',   icon: FolderTree },
  { key: 'roles',      href: '/admin/roles',      label: 'הרשאות ותפקידים',  icon: ShieldCheck },
  { key: 'plans',      href: '/admin/plans',      label: 'תוכניות שירות',    icon: Briefcase },
]

interface AdminSidebarProps {
  open?: boolean
  onClose?: () => void
}

export default function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  }

  const content = (
    <aside className="flex h-full w-60 flex-col border-l border-[#2C3B38] bg-[#20302F]">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-[#2C3B38] px-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C8AA8F]/30 bg-[#C8AA8F]/5">
            <span className="text-xs font-bold tracking-wider text-[#C8AA8F]">IA</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#F0EDE8]">פורטל מנהל</p>
            <p className="text-[10px] text-[#445147]">The Investment Academy</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-[#445147] hover:text-[#86968B] transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3" dir="rtl">
        {NAV.map(({ key, href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={key}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-[#C8AA8F]/10 font-medium text-[#C8AA8F]'
                  : 'text-[#86968B] hover:bg-[#2C3B38] hover:text-[#F0EDE8]'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Back link */}
      <div className="border-t border-[#2C3B38] p-3" dir="rtl">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#445147] transition-colors hover:text-[#86968B]"
        >
          <ChevronRight size={13} />
          חזרה ללוח הבקרה
        </Link>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex h-full">
        {content}
      </div>

      {/* Mobile: overlay drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-row-reverse">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-50 h-full">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
