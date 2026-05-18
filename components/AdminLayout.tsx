'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const NAV = [
  { href: '/admin/orders', label: 'Orders', icon: '📦' },
  { href: '/admin/production', label: 'Production', icon: '🏭' },
  { href: '/admin/inventory', label: 'Inventory', icon: '📊' },
  { href: '/admin/customers', label: 'Customers', icon: '👥' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/admin/login')
      else setChecking(false)
    })
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
      <div className="text-white text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: 'var(--navy)' }}>
        <div className="p-5 border-b border-white/10">
          <div className="text-white font-black text-lg">
            SMOKED <span style={{ color: 'var(--orange)' }}>STYLE</span>
          </div>
          <div className="text-white/40 text-xs mt-0.5">Admin Panel</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors">
            ← View Store
          </Link>
          <button onClick={signOut} className="flex items-center gap-2 px-3 py-2 text-white/40 hover:text-white/70 text-xs w-full text-left transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
