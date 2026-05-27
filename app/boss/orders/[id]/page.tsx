'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Order } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { formatDeliveryDate, formatOrderDate } from '@/lib/dates'
import OrderStatusActions from '@/components/OrderStatusActions'
import PendingOrderItemsEditor from '@/components/PendingOrderItemsEditor'
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

  const isPending = order.status === 'pending'
  const canEditStatus = !isPending && order.status !== 'payment_failed'

  return (
    <div className={`space-y-3 p-4 text-base ${isPending ? 'pb-28' : 'pb-6'}`}>
      <Link
        href="/boss/orders"
        className="flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-gray-700 shadow-sm"
      >
        ← Back
      </Link>

      <section className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="text-lg font-black tracking-wide text-orange-600">{order.order_number}</div>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-black capitalize">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-xl font-black">{displayBuyerName(order)}</div>
        {order.created_at && (
          <div className="text-xs text-gray-500">Ordered: {formatOrderDate(order.created_at)}</div>
        )}
        {displayBuyerPhone(order) && (
          <a
            className="inline-block py-1 text-base font-bold text-green-700"
            href={`https://wa.me/${String(displayBuyerPhone(order)).replace(/\D/g, '')}`}
          >
            {displayBuyerPhone(order)}
          </a>
        )}
        {displayBuyerEmail(order) && (
          <div className="text-sm text-gray-500">{displayBuyerEmail(order)}</div>
        )}
        {order.recipient_name && (
          <div className="mt-1 text-sm text-gray-600">
            Recipient: <span className="font-bold">{order.recipient_name}</span>
            {order.recipient_phone && (
              <span className="text-gray-500"> · {order.recipient_phone}</span>
            )}
          </div>
        )}

        {canEditStatus && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <OrderStatusActions order={order} onUpdated={loadOrder} useBossAuth compact />
          </div>
        )}
      </section>

      {isPending ? (
        <PendingOrderItemsEditor order={order} onUpdated={loadOrder} useBossAuth />
      ) : (
        <section className="rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="mb-2 text-base font-black">Items</h2>
          {(order.order_items ?? []).map(item => (
            <div key={item.id} className="flex justify-between border-b border-gray-50 py-2 last:border-0">
              <div className="min-w-0 pr-2">
                <strong className="text-sm">
                  {item.quantity}x {item.product_name}
                </strong>
                <div className="text-xs text-gray-500">
                  {[item.selected_flavor, item.selected_weight && `${item.selected_weight} lb`, item.selected_size]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="shrink-0 text-sm font-black">${Number(item.line_total).toFixed(2)}</div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl bg-white p-3 text-sm shadow-sm">
        <div className="flex justify-between">
          <span>Delivery fee</span>
          <strong>${order.delivery_fee.toFixed(2)}</strong>
        </div>
        <div className="mt-1 flex justify-between text-lg font-black">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
        {order.delivery_date && (
          <div className="mt-2 font-bold">Date: {formatDeliveryDate(order.delivery_date)}</div>
        )}
        {order.delivery_address && <div className="mt-1 text-gray-600">{order.delivery_address}</div>}
        {order.order_notes && <div className="mt-2 rounded-xl bg-gray-50 p-2">{order.order_notes}</div>}
        {order.gift_message && <div className="mt-2 rounded-xl bg-orange-50 p-2">{order.gift_message}</div>}
      </section>

      {error && !isPending && (
        <div className="rounded-xl bg-red-50 p-2 text-sm font-bold text-red-700">{error}</div>
      )}

      {isPending && (
        <div className="fixed bottom-24 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="mx-auto max-w-lg space-y-2">
            {showReason ? (
              <>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Rejection reason"
                  className="h-10 w-full rounded-xl border px-3 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReason(false)}
                    className="h-11 flex-1 rounded-xl border text-sm font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={reject}
                    disabled={busy}
                    className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-black text-white disabled:opacity-60"
                  >
                    Confirm reject
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={approve}
                  disabled={busy}
                  className="h-11 flex-1 rounded-xl bg-green-600 text-sm font-black text-white disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setShowReason(true)}
                  className="h-11 rounded-xl bg-red-600 px-5 text-sm font-black text-white"
                >
                  Reject
                </button>
              </div>
            )}
            {error && <p className="text-center text-xs font-bold text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
