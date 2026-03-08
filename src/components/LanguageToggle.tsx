'use client'

import { Globe } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'

export default function LanguageToggle() {
  const { lang, setLang } = useLang()
  const next  = lang === 'he' ? 'en' : 'he'
  const label = lang === 'he' ? 'EN' : 'HE'

  return (
    <button
      onClick={() => setLang(next)}
      aria-label={`Switch to ${next === 'he' ? 'Hebrew' : 'English'}`}
      className="
        flex items-center gap-1.5 rounded-xl
        border border-[#2C3B38] bg-[#101A26]/60
        px-2.5 py-1.5
        text-xs font-bold tracking-wider text-[#86968B]
        transition-all duration-150
        hover:border-[#C8AA8F]/40 hover:bg-[#C8AA8F]/8 hover:text-[#C8AA8F]
      "
    >
      <Globe size={13} strokeWidth={2} />
      {label}
    </button>
  )
}
