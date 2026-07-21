'use client'

import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import SignOutButton from '@/components/SignOutButton'

interface HeaderProps {
  cartCount: number
  cartTotal: number
  user: User | null
  authReady?: boolean
  onSignIn?: () => void
  onSignOut: () => void
}

export default function Header({
  cartCount,
  cartTotal,
  user,
  authReady = true,
  onSignIn,
  onSignOut,
}: HeaderProps) {
  const email = user?.email ?? ''

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(251, 250, 247, 0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--rustic-rule)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <span
            className="text-[22px] leading-none"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              color: 'var(--rustic-smoke)',
            }}
          >
            Smoked <span style={{ color: 'var(--rustic-navy)' }}>Style</span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!authReady ? (
            <span className="hidden h-9 w-20 animate-pulse rounded-lg bg-black/5 sm:inline-block" aria-hidden />
          ) : user ? (
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="hidden max-w-[140px] truncate text-xs font-medium sm:inline md:max-w-[200px]"
                style={{ color: 'var(--rustic-muted)' }}
                title={email}
              >
                {email}
              </span>
              <SignOutButton
                onClick={onSignOut}
                className="!px-3 !py-2 text-xs sm:text-sm"
                variant="light"
              />
            </div>
          ) : onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="shrink-0 px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                fontFamily: "'Work Sans', system-ui, sans-serif",
                color: 'var(--rustic-ink-soft)',
              }}
            >
              Sign In
            </button>
          ) : null}

          <Link
            href="/cart"
            className="flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-bold transition-opacity hover:opacity-95"
            style={{
              background: 'var(--rustic-ember)',
              color: 'var(--rustic-navy)',
              borderRadius: '9999px',
            }}
          >
            <CartIcon />
            {cartCount > 0 ? (
              <>
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
                  style={{ background: 'var(--rustic-navy)' }}
                >
                  {cartCount}
                </span>
                <span>${cartTotal.toFixed(2)}</span>
              </>
            ) : (
              <span>Cart</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  )
}
