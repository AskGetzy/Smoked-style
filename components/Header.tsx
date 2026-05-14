'use client'

import Link from 'next/link'

interface HeaderProps {
  cartCount: number
  cartTotal: number
  user: any
  onSignOut: () => void
}

export default function Header({ cartCount, cartTotal, user, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 shadow-md" style={{ background: 'var(--navy)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-white font-black text-xl tracking-wide">
            SMOKED <span style={{ color: 'var(--orange)' }}>STYLE</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={onSignOut}
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              Sign Out
            </button>
          ) : null}

          <Link
            href="/cart"
            className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <CartIcon />
            {cartCount > 0 && (
              <>
                <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
