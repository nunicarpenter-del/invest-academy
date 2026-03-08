'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations, type Lang, type T } from '@/lib/i18n'

interface LangCtx {
  lang:    Lang
  t:       T
  setLang: (l: Lang) => void
}

const LanguageContext = createContext<LangCtx>({
  lang:    'he',
  t:       translations.he,
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he')

  // Hydrate from localStorage on first render
  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored === 'en' || stored === 'he') setLangState(stored)
  }, [])

  // Sync <html> attributes and persist whenever lang changes
  useEffect(() => {
    const t = translations[lang]
    document.documentElement.lang = lang
    document.documentElement.dir  = t.dir
    localStorage.setItem('lang', lang)
  }, [lang])

  const setLang = (l: Lang) => setLangState(l)

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
