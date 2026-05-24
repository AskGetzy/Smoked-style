'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Order } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { formatDeliveryDate, formatOrderDate } from '@/lib/dates'
import OrderStatusActions from '@/components/OrderStatusActions'
import { displayBuyerEmail, displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'

export default function BossOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { void loadOrder() }, [id])

  async function loadOrder() {
    setLoading(true)
    const res = await fetchWithAuth(`/api/admin/orders?id=${encodeURIComponent(id)}`)
    const data = await res.json()
    setOrder(data.order ?? null)
    setLoading(false)
  }

  async function approve() {
    setBusy(true)
    setError('')
    const res = await fetchWithAuth('/api/capture-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    })
    if (res.ok) await loadOrder()
    else setError((await res.json()).error ?? 'Could not approve')
    setBusy(false)
  }

  async function reject() {
    setBusy(true)
    setError('')
    const res = await fetchWithAuth('/api/reject-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id, reason }),
    })
    if (res.ok) router.push('/boss/orders')
    else setError((await res.json()).error ?? 'Could not reject')
    setBusy(false)
  }

  if (loading) return <div className="p-4 text-base">Loading...</div>
  if (!order) return <div className="p-4 text-base">Order not found</div>

  const items = order.order_items ?? []
  const isPending = order.status === 'pending'
  const canEditStatus =
    !isPending && order.status !== 'cancelled' && order.status !== 'payment_failed'
  const showBottomBar = isPending || canEditStatus

  return (
    <div className={`space-y-4 p-4 text-base ${showBottomBar ? 'pb-72' : 'pb-6'}`}>
      <Link
        href="/boss/orders"
        className="flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 text-base font-black text-gray-700 shadow-sm"
      >
        ← Back to orders
      </Link>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="text-xl font-black tracking-wide text-orange-600">{order.order_number}</div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-black capitalize">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-2xl font-black">{displayBuyerName(order)}</div>
        {order.created_at && (
          <div className="text-sm text-gray-500">Ordered: {formatOrderDate(order.created_at)}</div>
        )}
        {displayBuyerPhone(order) && (
          <a
            className="block min-h-12 py-2 text-lg font-black text-green-700"
            href={`https://wa.me/${String(displayBuyerPhone(order)).replace(/\D/g, '')}`}
          >
            {displayBuyerPhone(order)}
          </a>
        )}
        {displayBuyerEmail(order) && (
          <div className="text-base text-gray-500">{displayBuyerEmail(order)}</div>
        )}
        {order.recipient_name && (
          <div className="mt-2 text-base text-gray-600">
            Recipient: <span className="font-bold">{order.recipient_name}</span>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">Items</h2>
        {items.map(item => (
          <div key={item.id} className="flex justify-between border-b py-3 last:border-0">
            <div>
              <strong>{item.quantity}x {item.product_name}</strong>
              <div className="text-sm text-gray-500">
                {[item.selected_flavor, item.selected_weight && `${item.selected_weight} lb`, item.selected_size]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            </div>
            <div className="font-black">${Number(item.line_total).toFixed(2)}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex justify-between text-lg">
          <span>Delivery fee</span>
          <strong>${order.delivery_fee.toFixed(2)}</strong>
        </div>
        <div className="mt-2 flex justify-between text-2xl font-black">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
        {order.delivery_date && (
          <div className="mt-3 text-base font-bold">Date: {formatDeliveryDate(order.delivery_date)}</div>
        )}
        {order.delivery_address && <div className="mt-1 text-base text-gray-600">{order.delivery_address}</div>}
        {order.order_notes && <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-base">{order.order_notes}</div>}
        {order.gift_message && <div className="mt-3 rounded-2xl bg-orange-50 p-3 text-base">{order.gift_message}</div>}
      </section>

      {error && !showBottomBar && (
        <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</div>
      )}

      {showBottomBar && (
        <div className="fixed bottom-24 left-0 right-0 z-40 max-h-[55vh] overflow-y-auto border-t border-gray-100 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="mx-auto max-w-lg space-y-3">
            <h2 className="text-lg font-black text-gray-900">
              {isPending ? 'Approve or reject' : 'Order status'}
            </h2>

            {isPending ? (
              <>
                <button
                  type="button"
                  onClick={approve}
                  disabled={busy}
                  className="min-h-14 w-full rounded-2xl bg-green-600 text-lg font-black text-white disabled:opacity-60"
                >
                  Approve
                </button>
                {showReason ? (
                  <div className="space-y-3">
                    <input
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Reason"
                      className="h-12 w-full rounded-2xl border px-4 text-base"
                    />
                    <button
                      type="button"
                      onClick={reject}
                      disabled={busy}
                      className="min-h-14 w-full rounded-2xl bg-red-600 text-lg font-black text-white disabled:opacity-60"
                    >
                      Confirm Reject
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReason(true)}
                    className="min-h-14 w-full rounded-2xl bg-red-600 text-lg font-black text-white"
                  >
                    Reject
                  </button>
                )}
              </>
            ) : (
              <OrderStatusActions order={order} onUpdated={loadOrder} useBossAuth />
            )}

            {error && <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
