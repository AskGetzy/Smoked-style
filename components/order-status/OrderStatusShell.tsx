import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ORDER_TRACKING_CONTACT_EMAIL,
  ORDER_TRACKING_CONTACT_PHONE,
} from '@/lib/order-tracking'

export function OrderStatusLogo() {
  return (
    <div className="text-center">
      <div
        className="text-[28px] font-semibold tracking-tight"
        style={{ fontFamily: "'Playfair Display', serif", color: 'var(--rustic-smoke)' }}
      >
        Smoked <span style={{ color: 'var(--rustic-navy)' }}>Style</span>
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--rustic-muted)' }}>
        Premium smoked meats, prepared with care
      </p>
    </div>
  )
}

export function OrderContactFooter() {
  return (
    <div
      className="rounded-2xl p-4 text-center text-sm"
      style={{
        border: '1px solid var(--rustic-rule)',
        background: 'var(--rustic-surface)',
        color: 'var(--rustic-ink-soft)',
      }}
    >
      <p className="font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
        Questions about your order?
      </p>
      <p className="mt-2">
        <a href="tel:7188109472" className="font-semibold" style={{ color: 'var(--rustic-green-soft)' }}>
          {ORDER_TRACKING_CONTACT_PHONE}
        </a>
        {' · '}
        <a
          href={`mailto:${ORDER_TRACKING_CONTACT_EMAIL}`}
          className="font-semibold"
          style={{ color: 'var(--rustic-green-soft)' }}
        >
          {ORDER_TRACKING_CONTACT_EMAIL}
        </a>
      </p>
    </div>
  )
}

export function OrderStatusPageShell({
  children,
  backHref,
  backLabel = 'Find another order',
}: {
  children: ReactNode
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--rustic-bg)' }}>
      <div className="mx-auto w-full max-w-lg space-y-6">
        <OrderStatusLogo />
        {children}
        <OrderContactFooter />
        {backHref && (
          <div className="text-center">
            <Link
              href={backHref}
              className="text-sm font-semibold"
              style={{ color: 'var(--rustic-green-soft)' }}
            >
              {backLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
