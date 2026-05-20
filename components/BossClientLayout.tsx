'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import LanguageToggle from '@/components/LanguageToggle'
import OrderNotificationWatcher from '@/components/OrderNotificationWatcher'
import { LanguageProvider, useLanguage } from '@/lib/language-context'
import type { TranslationKey } from '@/lib/i18n'
import { arrayBufferToBase64, urlBase64ToUint8Array } from '@/lib/push-client'

const NAV: { href: string; key: TranslationKey; icon: string }[] = [
  { href: '/boss/new-order', key: 'newOrder', icon: '＋' },
  { href: '/boss/orders', key: 'orders', icon: '☰' },
  { href: '/boss/production', key: 'production', icon: '▣' },
  { href: '/boss/dashboard', key: 'dashboard', icon: '⌂' },
]

const TITLE_KEYS: Record<string, TranslationKey> = {
  '/boss/new-order': 'newOrder',
  '/boss/orders': 'orders',
  '/boss/production': 'production',
  '/boss/dashboard': 'dashboard',
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function BossClientLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { t } = useLanguage()
  const [checking, setChecking] = useState(pathname !== '/boss/login')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (pathname === '/boss/login') return

    let cancelled = false
    async function checkAccess() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/boss/login')
        return
      }

      const res = await fetch('/api/boss/auth', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) {
        router.push('/boss/login')
        return
      }

      if (!cancelled) setChecking(false)
    }

    void checkAccess()
    return () => { cancelled = true }
  }, [pathname, router, supabase])

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (pathname === '/boss/login') return

    async function setupPWA() {
      if (!('serviceWorker' in navigator)) return

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey || !('PushManager' in window)) return

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const { data } = await supabase.auth.getSession()
      const userEmail = data.session?.user?.email ?? 'boss'

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
          auth: arrayBufferToBase64(sub.getKey('auth')),
          userEmail,
        }),
      })
    }

    void setupPWA()
  }, [pathname, supabase])

  async function installApp() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/boss/login')
  }

  if (pathname === '/boss/login') return <>{children}</>

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white" style={{ background: 'var(--navy)' }}>
        <div className="text-base font-semibold">{t.loadingBossPortal}</div>
      </div>
    )
  }

  const orderDetailMatch = pathname.match(/^\/boss\/orders\/([^/]+)$/)
  const titleKey = TITLE_KEYS[pathname] ?? (orderDetailMatch ? 'orders' : 'dashboard')
  const title = t[titleKey]

  return (
    <div className="min-h-screen pb-24 text-gray-900" style={{ background: '#f8fafc' }}>
      <OrderNotificationWatcher mode="boss" />

      <header className="sticky top-0 z-40 border-b border-white/10 px-4 py-3" style={{ background: 'var(--navy)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black tracking-wider text-white/50">SMOKED STYLE</div>
            <h1 className="text-xl font-black text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {deferredPrompt && (
              <button
                type="button"
                onClick={() => void installApp()}
                className="min-h-12 rounded-2xl bg-orange-600 px-3 text-sm font-black text-white"
              >
                {t.installApp}
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              className="min-h-12 rounded-2xl bg-white/10 px-4 text-base font-bold text-white"
            >
              {t.signOut}
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 px-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] pt-2"
        style={{ background: 'var(--navy)' }}
      >
        <div className="grid grid-cols-4 gap-1">
          {NAV.map(item => {
            const active =
              pathname === item.href ||
              (item.href === '/boss/orders' && pathname.startsWith('/boss/orders/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-xs font-bold ${
                  active ? 'bg-white text-slate-900' : 'text-white/65'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span>{t[item.key]}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default function BossClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <BossClientLayoutInner>{children}</BossClientLayoutInner>
    </LanguageProvider>
  )
}
