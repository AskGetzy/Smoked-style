'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { fetchOrder() }, [id])

  async function fetchOrder() {
    const { data } = await supabase
      .from('orders')
      .select('*, customers(*), order_items(*)')
      .eq('id', id)
      .single()
    setOrder(data)
    setLoading(false)
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
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id)
    setShowRejectModal(false)
    fetchOrder()
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
      <div className="p-6 text-center text-gray-400">Order not found</div>
    </AdminLayout>
  )

  const customer = order.customers as any
  const items = order.order_items ?? []

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/orders" className="text-gray-400 hover:text-gray-600 text-sm">← Orders</Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">{order.order_number}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Customer */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
            <p className="font-bold text-gray-900">{customer?.full_name ?? 'Guest'}</p>
            {customer?.email && <p className="text-sm text-gray-500">{customer.email}</p>}
            {customer?.phone && <p className="text-sm text-gray-500">📞 {customer.phone}</p>}
            {order.delivery_address && <p className="text-sm text-gray-600 mt-2">📍 {order.delivery_address}</p>}
            {order.delivery_date && (
              <p className="text-sm text-gray-600 mt-1">
                📅 {new Date(order.delivery_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-gray-900 mb-1">Actions</h3>
            {order.status === 'pending' && (
              <>
                <button onClick={() => setShowApproveModal(true)}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700">
                  ✓ Approve & Charge
                </button>
                <button onClick={() => setShowRejectModal(true)}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600">
                  ✕ Reject
                </button>
              </>
            )}
            {order.status === 'approved' && (
              <button onClick={async () => {
                await supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', id)
                fetchOrder()
              }} className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700">
                🚗 Mark Out for Delivery
              </button>
            )}
            {order.status === 'out_for_delivery' && (
              <button onClick={async () => {
                await supabase.from('orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', id)
                fetchOrder()
              }} className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700">
                ✓ Mark Delivered
              </button>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
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
              <p className="text-xs text-gray-500 font-semibold">Notes:</p>
              <p className="text-sm text-gray-700">{order.order_notes}</p>
            </div>
          )}
          {order.gift_message && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 font-semibold">Gift Message:</p>
              <p className="text-sm text-gray-700 italic">"{order.gift_message}"</p>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>${order.delivery_fee.toFixed(2)}</span></div>
            {order.custom_adjustment !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{order.custom_adjustment_note ?? 'Adjustment'}</span>
                <span className={order.custom_adjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                  {order.custom_adjustment > 0 ? '+' : ''}${order.custom_adjustment.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100 text-base">
              <span>Total</span>
              <span style={{ color: 'var(--orange)' }}>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Approve Order?</h3>
            <p className="text-gray-500 text-sm mb-4">
              This will charge the customer's card <strong>${order.total.toFixed(2)}</strong> and mark the order as approved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={approveOrder} disabled={approving}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                {approving ? 'Charging...' : 'Approve & Charge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Reject Order?</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason (optional)" rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={rejectOrder} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold">
                Reject Order
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
