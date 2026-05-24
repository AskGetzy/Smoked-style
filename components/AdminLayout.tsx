'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import OrderNotificationWatcher from '@/components/OrderNotificationWatcher'
import LanguageToggle from '@/components/LanguageToggle'
import SignOutButton from '@/components/SignOutButton'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { useLanguage } from '@/lib/language-context'
import type { TranslationKey } from '@/lib/i18n'

const BASE_NAV: { href: string; key: TranslationKey; icon: string }[] = [
  { href: '/admin/orders', key: 'orders', icon: '📦' },
  { href: '/admin/production', key: 'production', icon: '🏭' },
  { href: '/admin/inventory', key: 'inventory', icon: '📊' },
  { href: '/admin/customers', key: 'customers', icon: '👥' },
]

const OWNER_NAV = { href: '/admin/bookkeeping', key: 'bookkeeping' as TranslationKey, icon: '📒' }

/** Persists across per-page AdminLayout remounts so nav does not flash on route change. */
let adminSessionVerified = false

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [checking, setChecking] = useState(!adminSessionVerified)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (adminSessionVerified) {
      setChecking(false)
      return
    }

    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      if (!data.session) {
        adminSessionVerified = false
        router.push('/admin/login')
        return
      }
      adminSessionVerified = true
      setUserEmail(data.session.user.email ?? null)
      try {
        const res = await fetch('/api/admin/me', { credentials: 'include' })
        const me = await res.json()
        if (res.ok) setIsOwner(Boolean(me.isOwner))
      } catch {
        setIsOwner(false)
      }
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  async function signOut() {
    await supabase.auth.signOut()
    adminSessionVerified = false
    router.push('/admin/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>
      <aside
        className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col overflow-y-auto"
        style={{ background: 'var(--navy)' }}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-lg font-black text-white">
                SMOKED <span style={{ color: 'var(--orange)' }}>STYLE</span>
              </div>
              <div className="mt-0.5 text-xs text-white/40">{t.adminPanel}</div>
            </div>
            <LanguageToggle className="shrink-0" />
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {[...BASE_NAV, ...(isOwner ? [OWNER_NAV] : [])].map(item => (
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
        <div className="mt-auto border-t border-white/10 p-3">
          {userEmail && (
            <p className="mb-2 truncate px-3 text-xs font-medium text-white/70" title={userEmail}>
              {userEmail}
            </p>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-white/50 transition-colors hover:text-white/80"
          >
            ← {t.viewStore}
          </Link>
          <SignOutButton
            onClick={signOut}
            label={t.signOut}
            className="mt-2 w-full text-center"
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm"
        >
          <span className="truncate text-sm font-semibold text-gray-700">
            {userEmail ?? t.adminPanel}
          </span>
          <SignOutButton onClick={signOut} label={t.signOut} variant="light" className="shrink-0" />
        </div>

        <main className="relative flex-1 overflow-auto">
          {checking ? (
            <div className="flex min-h-[calc(100vh-0px)] items-center justify-center p-6">
              <div className="text-sm text-gray-500">{t.loading}</div>
            </div>
          ) : (
            <>
              <OrderNotificationWatcher mode="admin" />
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
