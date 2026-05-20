'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { formatDeliveryDate, formatOrderDate } from '@/lib/dates'
import { useLanguage } from '@/lib/language-context'
import { orderStatusLabel } from '@/lib/i18n'
import { displayBuyerEmail, displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'
import type { Order, OrderItem } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  ready_for_pickup: 'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

type EditableOrderItem = Pick<OrderItem, 'id' | 'product_name' | 'quantity' | 'unit_price'>

export default function OrderDetailPage() {
  const { t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [savingEdits, setSavingEdits] = useState(false)
  const [editItems, setEditItems] = useState<EditableOrderItem[]>([])
  const [editDeliveryFee, setEditDeliveryFee] = useState('')
  const [editAdjustment, setEditAdjustment] = useState('')
  const [editAdjustmentNote, setEditAdjustmentNote] = useState('')

  useEffect(() => { fetchOrder() }, [id])

  async function fetchOrder() {
    setError('')

    const res = await fetch(`/api/admin/orders?id=${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
    const payload = await res.json()

    if (!res.ok) {
      setError(payload.error ?? t.couldNotLoadOrder)
      setOrder(null)
    } else {
      setOrder(payload.order)
    }
    setLoading(false)
  }

  function startEditing() {
    if (!order) return

    setError('')
    setEditItems((order.order_items ?? []).map((item) => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })))
    setEditDeliveryFee(String(order.delivery_fee))
    setEditAdjustment(String(order.custom_adjustment))
    setEditAdjustmentNote(order.custom_adjustment_note ?? '')
    setIsEditing(true)
  }

  function updateEditItem(id: string, field: 'quantity' | 'unit_price', value: string) {
    const parsed = Number(value)
    setEditItems((current) => current.map((item) => (
      item.id === id ? { ...item, [field]: Number.isFinite(parsed) ? parsed : 0 } : item
    )))
  }

  async function saveOrderEdits() {
    setSavingEdits(true)
    setError('')

    const res = await fetch('/api/admin/orders/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        orderId: id,
        items: editItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        deliveryFee: Number(editDeliveryFee),
        customAdjustment: Number(editAdjustment),
        customAdjustmentNote: editAdjustmentNote,
      }),
    })
    const payload = await res.json()

    if (res.ok) {
      setOrder(payload.order)
      setIsEditing(false)
    } else {
      setError(payload.error ?? t.couldNotSaveOrder)
    }

    setSavingEdits(false)
  }

  async function approveOrder() {
    setApproving(true)
    const res = await fetch('/api/capture-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    })
    if (res.ok) {
      setShowApproveModal(false)
      fetchOrder()
    }
    setApproving(false)
  }

  async function rejectOrder() {
    const res = await fetch('/api/reject-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id, reason: rejectReason }),
    })

    if (res.ok) {
      setShowRejectModal(false)
      setRejectReason('')
      fetchOrder()
    } else {
      const payload = await res.json()
      setError(payload.error ?? t.couldNotRejectOrder)
    }
  }

  async function updateOrderStatus(status: 'ready_for_pickup' | 'out_for_delivery' | 'delivered') {
    setError('')
    const res = await fetch('/api/admin/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderId: id, status }),
    })

    if (res.ok) {
      fetchOrder()
    } else {
      const payload = await res.json()
      setError(payload.error ?? t.couldNotUpdateStatus)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    </AdminLayout>
  )

  if (!order) return (
    <AdminLayout>
      <div className="p-6 text-center text-gray-400">{error || t.orderNotFound}</div>
    </AdminLayout>
  )

  const customer = order.customers as any
  const items = order.order_items ?? []
  const editedSubtotal = editItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const editedTotal = editedSubtotal + Number(editDeliveryFee || 0) + Number(editAdjustment || 0)

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/orders" className="text-gray-400 hover:text-gray-600 text-sm">← {t.backToOrders}</Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">{order.order_number}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {orderStatusLabel(t, order.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Customer */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">{t.customer}</h3>
            <p className="font-bold text-gray-900">{displayBuyerName(order)}</p>
            {order.created_at && (
              <p className="text-sm text-gray-500">{t.orderedOn}: {formatOrderDate(order.created_at)}</p>
            )}
            {displayBuyerEmail(order) && (
              <p className="text-sm text-gray-500">{displayBuyerEmail(order)}</p>
            )}
            {displayBuyerPhone(order) && (
              <p className="text-sm text-gray-500">📞 {displayBuyerPhone(order)}</p>
            )}
            {order.delivery_address && <p className="text-sm text-gray-600 mt-2">📍 {order.delivery_address}</p>}
            {order.delivery_date && (
              <p className="text-sm text-gray-600 mt-1">
                📅 {formatDeliveryDate(order.delivery_date, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-gray-900 mb-1">{t.actions}</h3>
            {order.status === 'pending' && (
              <>
                <button onClick={startEditing}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--navy)' }}>
                  {t.editOrder}
                </button>
                <button onClick={() => setShowApproveModal(true)}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700">
                  ✓ {t.approveAndCharge}
                </button>
                <button onClick={() => setShowRejectModal(true)}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600">
                  ✕ {t.reject}
                </button>
              </>
            )}
            {order.status === 'approved' && (
              <>
                {order.order_type === 'pickup' ? (
                  <button onClick={() => updateOrderStatus('ready_for_pickup')} className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600">
                    {t.readyForPickup}
                  </button>
                ) : (
                  <button onClick={() => updateOrderStatus('out_for_delivery')} className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700">
                    🚗 {t.markOutForDelivery}
                  </button>
                )}
              </>
            )}
            {(order.status === 'out_for_delivery' || order.status === 'ready_for_pickup') && (
              <button onClick={() => updateOrderStatus('delivered')} className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700">
                ✓ {t.markDelivered}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {isEditing && (
          <div className="bg-white rounded-xl border border-orange-100 p-4 mb-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{t.editPendingOrder}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {t.editPendingOrderHint}
                </p>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-sm text-gray-400 hover:text-gray-600">
                {t.cancel}
              </button>
            </div>

            <div className="space-y-3">
              {editItems.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-gray-100 rounded-xl p-3">
                  <div className="md:col-span-6">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.item}</label>
                    <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.qty}</label>
                    <input type="number" min="0" step="1" value={item.quantity}
                      onChange={e => updateEditItem(item.id, 'quantity', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.unitPrice}</label>
                    <input type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={e => updateEditItem(item.id, 'unit_price', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div className="md:col-span-2 text-right">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t.lineTotal}</label>
                    <p className="font-semibold text-gray-900">${(item.quantity * item.unit_price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.deliveryFee}</label>
                <input type="number" min="0" step="0.01" value={editDeliveryFee}
                  onChange={e => setEditDeliveryFee(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.adjustment}</label>
                <input type="number" step="0.01" value={editAdjustment}
                  onChange={e => setEditAdjustment(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.newTotal}</label>
                <div className="rounded-lg bg-orange-50 px-3 py-2 font-bold" style={{ color: 'var(--orange)' }}>
                  ${editedTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t.adjustmentNote}</label>
              <input value={editAdjustmentNote} onChange={e => setEditAdjustmentNote(e.target.value)}
                placeholder={t.adjustmentNotePlaceholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setIsEditing(false)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold">
                {t.cancel}
              </button>
              <button onClick={saveOrderEdits} disabled={savingEdits}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--navy)' }}>
                {savingEdits ? t.savingEllipsis : t.saveAndEmailCustomer}
              </button>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">{t.items}</h3>
          <div className="divide-y divide-gray-100">
            {items.map((item: any) => (
              <div key={item.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                  <p className="text-xs text-gray-400">
                    {[item.selected_flavor, item.selected_weight && `${item.selected_weight}lb`, item.selected_size].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">×{item.quantity}</span>
                  <span className="font-semibold text-gray-900 ml-3">${item.line_total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          {order.order_notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-semibold">{t.notesLabel}:</p>
              <p className="text-sm text-gray-700">{order.order_notes}</p>
            </div>
          )}
          {order.gift_message && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 font-semibold">{t.giftMessage}:</p>
              <p className="text-sm text-gray-700 italic">"{order.gift_message}"</p>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{t.subtotal}</span><span>${order.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t.delivery}</span><span>${order.delivery_fee.toFixed(2)}</span></div>
            {order.custom_adjustment !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{order.custom_adjustment_note ?? t.adjustment}</span>
                <span className={order.custom_adjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                  {order.custom_adjustment > 0 ? '+' : ''}${order.custom_adjustment.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100 text-base">
              <span>{t.total}</span>
              <span style={{ color: 'var(--orange)' }}>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">{t.approveOrderTitle}</h3>
            <p className="text-gray-500 text-sm mb-4">
              {t.approveOrderBody} <strong>${order.total.toFixed(2)}</strong> {t.approveOrderBodySuffix}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold">{t.cancel}</button>
              <button onClick={approveOrder} disabled={approving}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                {approving ? t.charging : t.approveAndCharge}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">{t.rejectOrderTitle}</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder={t.rejectReasonOptional} rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold">{t.cancel}</button>
              <button onClick={rejectOrder} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold">
                {t.rejectOrderButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
