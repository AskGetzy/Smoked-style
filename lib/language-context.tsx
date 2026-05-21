'use client'

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
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

const langListeners = new Set<() => void>()

function readStoredLang(): Language {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'es' ? 'es' : 'en'
}

function subscribeLang(onStoreChange: () => void) {
  langListeners.add(onStoreChange)
  return () => langListeners.delete(onStoreChange)
}

function setStoredLang(newLang: Language) {
  localStorage.setItem(STORAGE_KEY, newLang)
  langListeners.forEach(listener => listener())
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, readStoredLang, () => 'en' as Language)

  function setLang(newLang: Language) {
    setStoredLang(newLang)
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
