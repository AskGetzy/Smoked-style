import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ORDER_TRACKING_CONTACT_EMAIL,
  ORDER_TRACKING_CONTACT_PHONE,
} from '@/lib/order-tracking'

export function OrderStatusLogo() {
  return (
    <div className="text-center">
      <div className="text-2xl font-black tracking-wide" style={{ color: 'var(--navy)' }}>
        SMOKED <span className="text-orange-500">STYLE</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">Premium smoked meats</p>
    </div>
  )
}

export function OrderContactFooter() {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center text-sm text-gray-600">
      <p className="font-semibold text-gray-800">Questions about your order?</p>
      <p className="mt-2">
        <a href="tel:7188109472" className="font-semibold text-orange-600">
          {ORDER_TRACKING_CONTACT_PHONE}
        </a>
        {' · '}
        <a href={`mailto:${ORDER_TRACKING_CONTACT_EMAIL}`} className="font-semibold text-orange-600">
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
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--cream)' }}>
      <div className="mx-auto w-full max-w-lg space-y-6">
        <OrderStatusLogo />
        {children}
        <OrderContactFooter />
        {backHref && (
          <div className="text-center">
            <Link href={backHref} className="text-sm font-semibold text-orange-600">
              {backLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
