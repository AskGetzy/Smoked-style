'use client'

import { useState } from 'react'
import Link from 'next/link'
import { OrderStatusPageShell } from '@/components/order-status/OrderStatusShell'
import { PUBLIC_STATUS_BADGE, publicStatusLabel } from '@/lib/order-tracking'
import { formatPhoneInput } from '@/lib/phone'
import { formatDeliveryDate } from '@/lib/dates'

type OrderResult = {
  order_number: string
  status: string
  delivery_date: string | null
  items_summary: string
}

export default function OrderStatusLookupPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<OrderResult[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOrders([])
    setLoading(true)

    const res = await fetch('/api/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
      cache: 'no-store',
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Could not find orders')
      return
    }

    setOrders(json.orders ?? [])
    if ((json.orders ?? []).length === 0) {
      setError('No orders found for this phone number.')
    }
  }

  return (
    <OrderStatusPageShell>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-black" style={{ color: 'var(--navy)' }}>
          Track Your Order
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Enter your phone number to find your order. No login required.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            Enter your phone number to find your order
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={e => setPhone(formatPhoneInput(e.target.value))}
              placeholder="(718) 555-1234"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: 'var(--navy)' }}
          >
            {loading ? 'Searching…' : 'Find My Order'}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error}</p>
        )}

        {orders.length > 0 && (
          <ul className="mt-6 space-y-3">
            {orders.map(order => (
              <li key={order.order_number}>
                <Link
                  href={`/order-status/${encodeURIComponent(order.order_number)}`}
                  className="block rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900">{order.order_number}</div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{order.items_summary}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Delivery: {formatDeliveryDate(order.delivery_date) || 'TBD'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                        PUBLIC_STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {publicStatusLabel(order.status)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </OrderStatusPageShell>
  )
}
