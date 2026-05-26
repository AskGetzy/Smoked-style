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
    <header className="rustic-divider sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,25,45,0.98),rgba(27,18,13,0.96))] shadow-[0_14px_40px_rgba(18,12,8,0.22)]">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white shadow-inner">
            SS
          </div>
          <div className="min-w-0">
            <div className="truncate font-serif text-2xl font-bold tracking-[0.08em] text-white">
              Smoked <span style={{ color: 'var(--gold)' }}>Style</span>
            </div>
            <div className="hidden truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60 sm:block">
              Premium cuts and smokehouse favorites
            </div>
          </div>
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!authReady ? (
            <span className="hidden h-10 w-24 animate-pulse rounded-2xl bg-white/10 sm:inline-block" aria-hidden />
          ) : user ? (
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="hidden max-w-[140px] truncate rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 sm:inline md:max-w-[220px]"
                title={email}
              >
                {email}
              </span>
              <SignOutButton
                onClick={onSignOut}
                className="!rounded-2xl !border-white/15 !bg-white/10 !px-3.5 !py-2.5 text-xs sm:text-sm"
                variant="navy"
              />
            </div>
          ) : onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Sign In
            </button>
          ) : null}

          <Link
            href="/cart"
            className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#f1d9a1]/25 bg-[linear-gradient(135deg,rgba(212,168,75,0.18),rgba(255,255,255,0.10))] px-3 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[#f1d9a1]/35 sm:px-4"
          >
            <CartIcon />
            {cartCount > 0 && (
              <>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {cartCount}
                </span>
                <span className="hidden sm:inline">${cartTotal.toFixed(2)}</span>
              </>
            )}
            {cartCount === 0 && <span className="hidden sm:inline">Cart</span>}
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
