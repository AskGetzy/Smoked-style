'use client'

import Link from 'next/link'

interface HeaderProps {
  cartCount: number
  cartTotal: number
  user: any
  onSignIn?: () => void
  onSignOut: () => void
}

export default function Header({ cartCount, cartTotal, user, onSignIn, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 shadow-md" style={{ background: 'var(--navy)' }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-wide text-white">
            SMOKED <span style={{ color: 'var(--orange)' }}>STYLE</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign Out
            </button>
          ) : onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign In
            </button>
          ) : null}

          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)' }}
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
