'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import OrderNotificationWatcher from '@/components/OrderNotificationWatcher'
import LanguageToggle from '@/components/LanguageToggle'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { useLanguage } from '@/lib/language-context'
import type { TranslationKey } from '@/lib/i18n'

const NAV: { href: string; key: TranslationKey; icon: string }[] = [
  { href: '/admin/orders', key: 'orders', icon: '📦' },
  { href: '/admin/production', key: 'production', icon: '🏭' },
  { href: '/admin/inventory', key: 'inventory', icon: '📊' },
  { href: '/admin/customers', key: 'customers', icon: '👥' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/admin/login')
      else setChecking(false)
    })
  }, [router, supabase])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--navy)' }}>
        <div className="text-sm text-white">{t.loading}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>
      <aside className="flex w-56 flex-shrink-0 flex-col" style={{ background: 'var(--navy)' }}>
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-lg font-black text-white">
                SMOKED <span style={{ color: 'var(--orange)' }}>STYLE</span>
              </div>
              <div className="mt-0.5 text-xs text-white/40">{t.adminPanel}</div>
            </div>
            <LanguageToggle />
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {t[item.key]}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 transition-colors hover:text-white/70"
          >
            ← {t.viewStore}
          </Link>
          <button
            onClick={signOut}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/40 transition-colors hover:text-white/70"
          >
            {t.signOut}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <OrderNotificationWatcher mode="admin" />
        {children}
      </main>
    </div>
  )
}
