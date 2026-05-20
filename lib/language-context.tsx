'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getTranslation, translations, type Language, type TranslationDict } from './i18n'

const STORAGE_KEY = 'admin-language'

type LanguageContextValue = {
  lang: Language
  setLang: (lang: Language) => void
  t: TranslationDict
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language
    if (saved === 'en' || saved === 'es') setLangState(saved)
  }, [])

  function setLang(newLang: Language) {
    setLangState(newLang)
    localStorage.setItem(STORAGE_KEY, newLang)
  }

  const t = useMemo(() => getTranslation(lang), [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
