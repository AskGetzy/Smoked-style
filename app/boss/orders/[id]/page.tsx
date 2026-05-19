'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Order } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { formatDeliveryDate } from '@/lib/dates'

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
    const res = await fetchWithAuth(`/api/admin/orders?id=${encodeURIComponent(id)}`)
    const data = await res.json()
    setOrder(data.order ?? null)
    setLoading(false)
  }

  async function approve() {
    setBusy(true)
    const res = await fetch('/api/capture-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    })
    if (res.ok) router.push('/boss/orders')
    else setError((await res.json()).error ?? 'Could not approve')
    setBusy(false)
  }

  async function reject() {
    setBusy(true)
    const res = await fetch('/api/reject-order', {
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

  const customer = order.customers as any
  const items = order.order_items ?? []

  return (
    <div className="space-y-4 p-4 text-base">
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="text-xl font-black tracking-wide text-orange-600">{order.order_number}</div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-black capitalize">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-2xl font-black">{customer?.full_name ?? 'Guest'}</div>
        {customer?.phone && <a className="block min-h-12 py-2 text-lg font-black text-green-700" href={`https://wa.me/${String(customer.phone).replace(/\D/g, '')}`}>{customer.phone}</a>}
        {customer?.email && <div className="text-base text-gray-500">{customer.email}</div>}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">Items</h2>
        {items.map((item: any) => (
          <div key={item.id} className="flex justify-between border-b py-3 last:border-0">
            <div><strong>{item.quantity}x {item.product_name}</strong><div className="text-sm text-gray-500">{[item.selected_flavor, item.selected_weight && `${item.selected_weight} lb`, item.selected_size].filter(Boolean).join(' • ')}</div></div>
            <div className="font-black">${Number(item.line_total).toFixed(2)}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex justify-between text-lg"><span>Delivery fee</span><strong>${order.delivery_fee.toFixed(2)}</strong></div>
        <div className="mt-2 flex justify-between text-2xl font-black"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
        {order.delivery_date && <div className="mt-3 text-base font-bold">Date: {formatDeliveryDate(order.delivery_date)}</div>}
        {order.delivery_address && <div className="mt-1 text-base text-gray-600">{order.delivery_address}</div>}
        {order.order_notes && <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-base">{order.order_notes}</div>}
        {order.gift_message && <div className="mt-3 rounded-2xl bg-orange-50 p-3 text-base">{order.gift_message}</div>}
      </section>

      {error && <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</div>}

      {order.status === 'pending' && (
        <div className="sticky bottom-24 space-y-3 rounded-3xl bg-white p-4 shadow-2xl">
          <button onClick={approve} disabled={busy} className="min-h-14 w-full rounded-2xl bg-green-600 text-lg font-black text-white">Approve</button>
          {showReason ? (
            <div className="space-y-3">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" className="h-12 w-full rounded-2xl border px-4 text-base" />
              <button onClick={reject} disabled={busy} className="min-h-14 w-full rounded-2xl bg-red-600 text-lg font-black text-white">Confirm Reject</button>
            </div>
          ) : (
            <button onClick={() => setShowReason(true)} className="min-h-14 w-full rounded-2xl bg-red-600 text-lg font-black text-white">Reject</button>
          )}
        </div>
      )}
    </div>
  )
}
