'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidEmailAddress, mapAuthError } from '@/lib/auth-errors'

type Props = {
  open: boolean
  onClose: () => void
  supabase: SupabaseClient
  title?: string
  description?: string
  onSuccess?: () => void
}

type AuthMode = 'signin' | 'signup'

export default function StorefrontSignInModal({
  open,
  onClose,
  supabase,
  title = 'Sign in to continue',
  description = 'Sign in to save your cart and order history.',
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (!open) {
      setMode('signin')
      setEmail('')
      setPassword('')
      setBusy(false)
      setError('')
      setInfo('')
    }
  }, [open])

  if (!open) return null

  async function signInWithGoogle() {
    setError('')
    setInfo('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (oauthError) {
      setError(mapAuthError(oauthError.message))
    }
  }

  async function handleForgotPassword() {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Enter your email address first, then tap Forgot password.')
      return
    }
    if (!isValidEmailAddress(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setBusy(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setBusy(false)

    if (resetError) {
      setError(mapAuthError(resetError.message))
      return
    }

    setInfo('Password reset email sent. Check your inbox.')
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!isValidEmailAddress(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setBusy(false)

      if (signInError) {
        setError(mapAuthError(signInError.message))
        return
      }

      onSuccess?.()
      onClose()
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    setBusy(false)

    if (signUpError) {
      setError(mapAuthError(signUpError.message))
      return
    }

    if (data.session) {
      onSuccess?.()
      onClose()
      return
    }

    setInfo('Account created. Check your email to confirm your account, then sign in.')
    setMode('signin')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="storefront-sign-in-title"
      >
        <h3
          id="storefront-sign-in-title"
          className="mb-2 text-center text-xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--rustic-smoke)' }}
        >
          {title}
        </h3>
        <p className="mb-6 text-center text-sm" style={{ color: 'var(--rustic-muted)' }}>
          {description}
        </p>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={busy}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          style={{ borderColor: 'var(--rustic-rule)' }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="auth-divider mb-5">
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3 text-left">
          <div>
            <label htmlFor="storefront-auth-email" className="sr-only">
              Email
            </label>
            <input
              id="storefront-auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="auth-input w-full"
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="storefront-auth-password" className="sr-only">
              Password
            </label>
            <input
              id="storefront-auth-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="auth-input w-full"
              disabled={busy}
              minLength={6}
            />
          </div>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              className="auth-forgot-link"
              disabled={busy}
            >
              Forgot password?
            </button>
          )}

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm font-medium" style={{ color: 'var(--rustic-muted)' }} role="status">
              {info}
            </p>
          )}

          <button type="submit" disabled={busy} className="auth-button-primary w-full disabled:opacity-50">
            {busy ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(current => (current === 'signin' ? 'signup' : 'signin'))
            setError('')
            setInfo('')
          }}
          className="auth-toggle-link mt-4 w-full"
          disabled={busy}
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600"
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}
