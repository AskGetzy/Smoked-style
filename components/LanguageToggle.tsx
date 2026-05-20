'use client'

import { useLanguage } from '@/lib/language-context'
import type { Language } from '@/lib/i18n'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage()

  function select(next: Language) {
    setLang(next)
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-white/20 bg-white/10 p-0.5 text-xs font-bold ${className}`}
      role="group"
      aria-label="Language"
    >
      {(['en', 'es'] as const).map(code => (
        <button
          key={code}
          type="button"
          onClick={() => select(code)}
          className={`min-w-[2rem] rounded-full px-2.5 py-1 uppercase transition-colors ${
            lang === code ? 'text-white shadow-sm' : 'text-white/55 hover:text-white/80'
          }`}
          style={lang === code ? { background: 'var(--orange)' } : undefined}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
