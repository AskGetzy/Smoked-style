'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrderStatusPageShell } from '@/components/order-status/OrderStatusShell'
import { publicStatusLabel } from '@/lib/order-tracking'
import { formatPhoneInput } from '@/lib/phone'
import { formatDeliveryDate } from '@/lib/dates'

type OrderResult = {
  order_number: string
  status: string
  delivery_date: string | null
  items_summary: string
}

export default function OrderStatusLookupPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<OrderResult[]>([])

  function goToOrderNumber(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = orderNumber.trim()
    if (!trimmed) return
    setError('')
    router.push(`/order-status/${encodeURIComponent(trimmed)}`)
  }

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
      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--rustic-surface)', border: '1px solid var(--rustic-rule)' }}
      >
        <h1
          className="mb-1 text-center text-[22px] font-semibold"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--rustic-smoke)' }}
        >
          Track Your Order
        </h1>
        <p className="mb-6 text-center text-sm" style={{ color: 'var(--rustic-muted)' }}>
          Search by phone or order number. No login required.
        </p>

        <form
          onSubmit={goToOrderNumber}
          className="mb-6 space-y-3 rounded-2xl p-4"
          style={{ background: 'var(--rustic-bg)', border: '1px solid var(--rustic-rule)' }}
        >
          <label className="block text-sm font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
            Order number
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="SS-2026-0029 or 0029"
              className="mt-2 w-full rounded-full border bg-white px-4 py-3 text-base outline-none"
              style={{ borderColor: 'var(--rustic-rule)' }}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full py-3 text-sm font-bold"
            style={{
              border: '1.5px solid var(--rustic-navy)',
              color: 'var(--rustic-navy)',
              background: 'transparent',
            }}
          >
            Track by order number
          </button>
        </form>

        <div
          className="mb-4 text-center text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--rustic-muted)' }}
        >
          or search by phone
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
            Enter your phone number to find your order
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={e => setPhone(formatPhoneInput(e.target.value))}
              placeholder="(718) 555-1234"
              className="mt-2 w-full rounded-full border bg-white px-4 py-3 text-base outline-none"
              style={{ borderColor: 'var(--rustic-rule)' }}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3.5 text-sm font-bold disabled:opacity-60"
            style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
          >
            {loading ? 'Searching…' : 'Find My Order'}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {orders.length > 0 && (
          <ul className="mt-6 space-y-3">
            {orders.map(order => (
              <li key={order.order_number}>
                <Link
                  href={`/order-status/${encodeURIComponent(order.order_number)}`}
                  className="block rounded-2xl p-4 transition"
                  style={{
                    border: '1px solid var(--rustic-rule)',
                    background: 'var(--rustic-bg)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold" style={{ color: 'var(--rustic-smoke)' }}>
                        {order.order_number}
                      </div>
                      <p
                        className="mt-1 line-clamp-2 text-sm"
                        style={{ color: 'var(--rustic-ink-soft)' }}
                      >
                        {order.items_summary}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--rustic-muted)' }}>
                        Delivery: {formatDeliveryDate(order.delivery_date) || 'TBD'}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase"
                      style={{
                        background: 'var(--rustic-green-pale)',
                        color: 'var(--rustic-green-soft)',
                      }}
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
