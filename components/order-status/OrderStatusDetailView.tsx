'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import OrderStatusBar from '@/components/order-status/OrderStatusBar'
import {
  formatItemLine,
  formatPublicDeliveryDate,
  publicStatusLabel,
  type PublicOrderDetail,
} from '@/lib/order-tracking'

type OrderPayload = PublicOrderDetail & { fetched_at?: string }

type Props = {
  orderNumber: string
}

export default function OrderStatusDetailView({ orderNumber }: Props) {
  const [order, setOrder] = useState<OrderPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const refreshStatus = useCallback(async () => {
    setRefreshing(true)
    setError('')

    try {
      const res = await fetch(
        `/api/order-status/${encodeURIComponent(orderNumber)}?t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
        },
      )
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Could not load order status')
        setOrder(null)
        return
      }

      setOrder(json as OrderPayload)
    } catch {
      setError('Could not load order status. Check your connection and try again.')
      setOrder(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orderNumber])

  useEffect(() => {
    setLoading(true)
    void refreshStatus()
    const interval = setInterval(() => void refreshStatus(), 20000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshStatus()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshStatus])

  if (loading) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--rustic-surface)', border: '1px solid var(--rustic-rule)' }}
      >
        <div
          className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--rustic-rule)', borderTopColor: 'var(--rustic-navy)' }}
        />
        <p className="text-sm" style={{ color: 'var(--rustic-muted)' }}>
          Loading order status…
        </p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'var(--rustic-surface)', border: '1px solid var(--rustic-rule)' }}
      >
        <p className="mb-4 text-sm text-red-700">{error || 'Order not found'}</p>
        <button
          type="button"
          onClick={() => void refreshStatus()}
          className="mb-3 w-full rounded-full py-3 text-sm font-bold"
          style={{ border: '1px solid var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
        >
          Try again
        </button>
        <Link
          href="/order-status"
          className="block w-full rounded-full py-3 text-center text-sm font-bold"
          style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
        >
          Look up another order
        </Link>
      </div>
    )
  }

  const isPickup = order.order_type === 'pickup'
  const statusLabel = publicStatusLabel(order.status, order.order_type)

  return (
    <div className="space-y-4">
      {/* Active status hero card — inspired by design handoff */}
      <div
        className="rounded-[20px] px-5 py-5 text-white"
        style={{ background: 'var(--rustic-navy)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-xs font-semibold uppercase tracking-[0.06em]"
            style={{ color: 'oklch(85% 0.03 155)' }}
          >
            Order {order.order_number}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
          >
            {statusLabel}
          </span>
        </div>
        <h1
          className="mt-3 text-[22px] font-semibold leading-snug"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {isPickup
            ? statusLabel === 'Ready for Pickup'
              ? 'Ready for pickup'
              : statusLabel === 'Delivered'
                ? 'Picked up'
                : 'We\'re preparing your order'
            : statusLabel === 'Out for Delivery'
              ? 'Out for delivery'
              : statusLabel === 'Delivered'
                ? 'Delivered'
                : 'Tracking your delivery'}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Live status{refreshing ? ' · updating…' : ''} ·{' '}
          {formatPublicDeliveryDate(order.delivery_date)}
        </p>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--rustic-surface)', border: '1px solid var(--rustic-rule)' }}
      >
        <OrderStatusBar status={order.status} orderType={order.order_type} />
      </div>

      <div
        className="rounded-2xl px-4 py-2 text-sm"
        style={{ background: 'var(--rustic-surface)', border: '1px solid var(--rustic-rule)' }}
      >
        <div
          className="flex justify-between gap-4 border-b py-3"
          style={{ borderColor: 'var(--rustic-rule)' }}
        >
          <span style={{ color: 'var(--rustic-muted)' }}>Delivery date</span>
          <span className="font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
            {formatPublicDeliveryDate(order.delivery_date)}
          </span>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <span style={{ color: 'var(--rustic-muted)' }}>
            {isPickup ? 'Fulfillment' : 'Delivery area'}
          </span>
          <span className="text-right font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
            {isPickup ? 'Pickup' : order.delivery_area_name || 'Delivery'}
          </span>
        </div>
        {!isPickup && order.delivery_address && (
          <div className="border-t pt-3 pb-3" style={{ borderColor: 'var(--rustic-rule)' }}>
            <div style={{ color: 'var(--rustic-muted)' }}>Address</div>
            <div className="mt-1 font-medium" style={{ color: 'var(--rustic-smoke)' }}>
              {order.delivery_address}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2
          className="mb-3 text-[15px] font-bold"
          style={{ color: 'var(--rustic-smoke)' }}
        >
          Order Summary
        </h2>
        <div
          className="rounded-2xl px-4"
          style={{ background: 'var(--rustic-surface)', border: '1px solid var(--rustic-rule)' }}
        >
          {order.order_items.length === 0 ? (
            <p className="py-3 text-sm" style={{ color: 'var(--rustic-muted)' }}>
              No items listed.
            </p>
          ) : (
            order.order_items.map((item, index) => (
              <div
                key={index}
                className="flex justify-between gap-3 py-3 text-[13.5px]"
                style={{
                  borderTop: index ? '1px solid var(--rustic-rule)' : 'none',
                  color: 'var(--rustic-smoke)',
                }}
              >
                <span>{formatItemLine(item)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {order.gift_message && (
        <div
          className="rounded-2xl p-4"
          style={{
            border: '1px solid var(--rustic-rule)',
            background: 'var(--rustic-green-pale)',
          }}
        >
          <div
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: 'var(--rustic-green-soft)' }}
          >
            Gift message
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--rustic-smoke)' }}>
            {order.gift_message}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void refreshStatus()}
        disabled={refreshing}
        className="w-full rounded-full py-3.5 text-sm font-bold disabled:opacity-60"
        style={{
          border: '1px solid var(--rustic-rule)',
          background: 'var(--rustic-surface)',
          color: 'var(--rustic-smoke)',
        }}
      >
        {refreshing ? 'Refreshing…' : 'Refresh status'}
      </button>

      <Link
        href="/order-status"
        className="block w-full rounded-full py-3.5 text-center text-sm font-bold"
        style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
      >
        Look up another order
      </Link>
    </div>
  )
}
