'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const NAV = [
  { href: '/boss/new-order', label: 'New Order', icon: '＋' },
  { href: '/boss/orders', label: 'Orders', icon: '☰' },
  { href: '/boss/production', label: 'Production', icon: '▣' },
  { href: '/boss/dashboard', label: 'Dashboard', icon: '⌂' },
]

const TITLES: Record<string, string> = {
  '/boss/new-order': 'New Order',
  '/boss/orders': 'Orders',
  '/boss/production': 'Production',
  '/boss/dashboard': 'Dashboard',
}

export default function BossLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [checking, setChecking] = useState(pathname !== '/boss/login')

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

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/boss/login')
  }

  if (pathname === '/boss/login') return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: 'var(--navy)' }}>
        <div className="text-base font-semibold">Loading boss portal...</div>
      </div>
    )
  }

  const orderDetailMatch = pathname.match(/^\/boss\/orders\/([^/]+)$/)
  const title = TITLES[pathname] ?? (orderDetailMatch ? 'Order' : 'Boss Portal')

  return (
    <div className="min-h-screen pb-24 text-gray-900" style={{ background: '#f8fafc' }}>
      <header className="sticky top-0 z-40 border-b border-white/10 px-4 py-3" style={{ background: 'var(--navy)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black tracking-wider text-white/50">SMOKED STYLE</div>
            <h1 className="text-xl font-black text-white">{title}</h1>
          </div>
          <button onClick={signOut} className="min-h-12 rounded-2xl bg-white/10 px-4 text-base font-bold text-white">
            Sign out
          </button>
        </div>
      </header>

      <main>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 px-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] pt-2" style={{ background: 'var(--navy)' }}>
        <div className="grid grid-cols-4 gap-1">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href === '/boss/orders' && pathname.startsWith('/boss/orders/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-xs font-bold ${
                  active ? 'bg-white text-slate-900' : 'text-white/65'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
