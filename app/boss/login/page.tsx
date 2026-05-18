'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function BossLoginPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/orders', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) {
      await supabase.auth.signOut()
      setError('This account is not authorized for the boss portal.')
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/boss/new-order')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'var(--navy)' }}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="text-3xl font-black tracking-wide" style={{ color: 'var(--navy)' }}>
            SMOKED <span style={{ color: 'var(--orange)' }}>STYLE</span>
          </div>
          <p className="mt-2 text-base font-semibold text-gray-500">Boss Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="h-14 w-full rounded-2xl border border-gray-200 px-4 text-base focus:outline-none focus:border-orange-400"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="h-14 w-full rounded-2xl border border-gray-200 px-4 text-base focus:outline-none focus:border-orange-400"
          />
          {error && <p className="text-base font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl text-base font-black text-white disabled:opacity-60"
            style={{ background: 'var(--navy)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
