'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminLayout from '@/components/AdminLayout'
import { formatDeliveryDate, formatOrderDate } from '@/lib/dates'
import { displayBuyerName } from '@/lib/order-buyer'
import type { Order } from '@/types'

const STATUS_TABS = ['all', 'pending', 'approved', 'out_for_delivery', 'delivered', 'cancelled']
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  ready_for_pickup: 'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/orders', {
      credentials: 'include',
      cache: 'no-store',
    })
    const payload = await res.json()

    if (!res.ok) {
      setError(payload.error ?? 'Could not load orders')
      setOrders([])
    } else {
      setOrders((payload.orders ?? []) as Order[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    const supabase = createClientComponentClient()
    const pollingFallback = window.setInterval(() => {
      void fetchOrders()
    }, 15000)

    const channel = supabase
      .channel('orders-list-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void fetchOrders()
      })
      .subscribe()

    return () => {
      window.clearInterval(pollingFallback)
      void supabase.removeChannel(channel)
    }
  }, [fetchOrders])

  const filtered = orders.filter(o => {
    const matchTab = activeTab === 'all' || o.status === activeTab
    const matchSearch = search === '' ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      displayBuyerName(o).toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Orders</h1>
          <div className="flex flex-wrap justify-end gap-3">
            <div className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
              {counts.pending} Pending
            </div>
            <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              {counts.approved} Approved
            </div>
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order number or customer name..."
          className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
        />

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={activeTab === tab ? { background: 'var(--navy)' } : {}}
            >
              {tab === 'all' ? 'All' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="mb-2 text-4xl">📭</div>
            <p>No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <div className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-orange-200 hover:shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-bold text-gray-900">{order.order_number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{displayBuyerName(order)}</p>
                      {order.created_at && (
                        <p className="text-xs text-gray-400">
                          Ordered: {formatOrderDate(order.created_at)}
                        </p>
                      )}
                      {order.delivery_date && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          📅 {formatDeliveryDate(order.delivery_date, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: 'var(--orange)' }}>${order.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
