'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import OrderStatusBar from '@/components/order-status/OrderStatusBar'
import {
  formatItemLine,
  formatPublicDeliveryDate,
  type PublicOrderDetail,
} from '@/lib/order-tracking'

type Props = {
  initialOrder: PublicOrderDetail
}

export default function OrderStatusDetailView({ initialOrder }: Props) {
  const [order, setOrder] = useState(initialOrder)
  const [refreshing, setRefreshing] = useState(false)

  const refreshStatus = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/order-status/${encodeURIComponent(order.order_number)}`,
        { cache: 'no-store' },
      )
      const json = await res.json()
      if (res.ok) {
        setOrder(json as PublicOrderDetail)
      }
    } finally {
      setRefreshing(false)
    }
  }, [order.order_number])

  useEffect(() => {
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

  const isPickup = order.order_type === 'pickup'

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-center gap-2">
        <div className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
          Order number
        </div>
        {refreshing && (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500"
            aria-hidden
          />
        )}
      </div>
      <h1 className="mb-6 text-center text-2xl font-black" style={{ color: 'var(--navy)' }}>
        {order.order_number}
      </h1>

      <div className="mb-8">
        <OrderStatusBar status={order.status} orderType={order.order_type} />
      </div>

      <div className="mb-6 rounded-xl bg-gray-50 p-4 text-sm">
        <div className="flex justify-between gap-4 border-b border-gray-200 py-2">
          <span className="text-gray-500">Delivery date</span>
          <span className="font-semibold text-gray-900">
            {formatPublicDeliveryDate(order.delivery_date)}
          </span>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <span className="text-gray-500">{isPickup ? 'Fulfillment' : 'Delivery area'}</span>
          <span className="text-right font-semibold text-gray-900">
            {isPickup ? 'Pickup' : order.delivery_area_name || 'Delivery'}
          </span>
        </div>
        {!isPickup && order.delivery_address && (
          <div className="border-t border-gray-200 pt-2">
            <div className="text-gray-500">Address</div>
            <div className="mt-1 font-medium text-gray-900">{order.delivery_address}</div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Items</h2>
        <ul className="space-y-2">
          {order.order_items.length === 0 ? (
            <li className="text-sm text-gray-500">No items listed.</li>
          ) : (
            order.order_items.map((item, index) => (
              <li
                key={index}
                className="rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-800"
              >
                {formatItemLine(item)}
              </li>
            ))
          )}
        </ul>
      </div>

      {order.gift_message && (
        <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Gift message
          </div>
          <p className="mt-1 text-sm text-amber-900">{order.gift_message}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void refreshStatus()}
        disabled={refreshing}
        className="mb-3 w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-800 disabled:opacity-60"
      >
        {refreshing ? 'Refreshing…' : 'Refresh status'}
      </button>

      <Link
        href="/order-status"
        className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white"
        style={{ background: 'var(--navy)' }}
      >
        Look up another order
      </Link>
    </div>
  )
}
