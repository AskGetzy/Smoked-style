'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import SignOutButton from '@/components/SignOutButton'

export default function AdminLoginPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedInEmail(data.session?.user?.email ?? null)
    })
  }, [supabase])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.refresh()
      router.push('/admin/orders')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSignedInEmail(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--navy)' }}>
      {signedInEmail && (
        <div className="fixed top-4 right-4 flex flex-col items-end gap-2">
          <span className="text-xs text-white/70">{signedInEmail}</span>
          <SignOutButton onClick={signOut} />
        </div>
      )}
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h1 className="text-xl font-black" style={{ color: 'var(--navy)' }}>
            SMOKED <span style={{ color: 'var(--orange)' }}>STYLE</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl disabled:opacity-60"
            style={{ background: 'var(--navy)' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
