'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { Order } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { formatDeliveryDate, formatOrderDate } from '@/lib/dates'
import OrderFulfillmentBadge from '@/components/OrderFulfillmentBadge'
import { displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'
import { orderMatchesNumberSearch } from '@/lib/order-number-search'

const TABS = [
  'all',
  'pending',
  'approved',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'payment_failed',
] as const

function tabLabel(tab: string): string {
  return tab === 'all' ? 'All' : tab.replace(/_/g, ' ')
}

function matchesSearch(order: Order, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const customer = order.customers as { full_name?: string; phone?: string; email?: string } | undefined
  const phoneDigits = (order.buyer_phone ?? customer?.phone ?? '').replace(/\D/g, '')
  const queryDigits = q.replace(/\D/g, '')
  return (
    orderMatchesNumberSearch(order.order_number ?? '', query) ||
    order.buyer_name?.toLowerCase().includes(q) ||
    customer?.full_name?.toLowerCase().includes(q) ||
    order.recipient_name?.toLowerCase().includes(q) ||
    (queryDigits.length > 0 && phoneDigits.includes(queryDigits)) ||
    customer?.email?.toLowerCase().includes(q) ||
    order.delivery_address?.toLowerCase().includes(q) ||
    (order.order_items ?? []).some(item => item.product_name.toLowerCase().includes(q))
  )
}

export default function BossOrdersPage() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const requested = searchParams.get('status')
    if (requested && (TABS as readonly string[]).includes(requested)) {
      setStatus(requested)
    }
  }, [searchParams])

  useEffect(() => { void loadOrders() }, [])

  async function loadOrders() {
    const res = await fetchWithAuth('/api/admin/orders')
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (search.trim()) {
      return orders.filter(order => matchesSearch(order, search))
    }
    return status === 'all' ? orders : orders.filter(order => order.status === status)
  }, [orders, status, search])

  return (
    <div className="p-4 pb-6">
      <div className="sticky top-[57px] z-30 -mx-4 mb-4 space-y-3 bg-[#f8fafc] px-4 pb-3 pt-1">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search order #, name, phone..."
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base shadow-sm focus:border-orange-400 focus:outline-none"
          autoComplete="off"
        />
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-2">
            {TABS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatus(tab)}
                className={`min-h-12 shrink-0 rounded-full px-5 text-base font-black capitalize ${status === tab ? 'text-white' : 'bg-white text-gray-700'}`}
                style={status === tab ? { background: 'var(--navy)' } : undefined}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-3xl bg-gray-200" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="rounded-3xl bg-white p-6 text-center text-base font-semibold text-gray-500">
          {search.trim() ? `No orders match "${search.trim()}".` : 'No orders in this tab.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const customer = order.customers as { full_name?: string; phone?: string } | undefined
            const items = order.order_items ?? []
            const itemSummary = items.slice(0, 3).map(item => `${item.quantity}x ${item.product_name}`).join(', ')
            return (
              <Link key={order.id} href={`/boss/orders/${order.id}`}>
                <div
                  className={`rounded-3xl bg-white p-4 shadow-sm ${
                    order.status === 'pending' ? 'border-2 border-orange-400' : 'border border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-black tracking-wide text-orange-600">
                        {order.order_number}
                      </div>
                      <div className="mt-1 text-lg font-black">{displayBuyerName(order)}</div>
                      {order.created_at && (
                        <div className="text-sm text-gray-400">
                          Ordered: {formatOrderDate(order.created_at)}
                        </div>
                      )}
                      {displayBuyerPhone(order) && (
                        <a
                          href={`tel:${displayBuyerPhone(order)}`}
                          onClick={e => e.stopPropagation()}
                          className="block min-h-8 text-base font-bold text-blue-700"
                        >
                          {displayBuyerPhone(order)}
                        </a>
                      )}
                      {itemSummary && <div className="mt-1 text-sm text-gray-500">{itemSummary}</div>}
                      {order.delivery_date && (
                        <div className="mt-1 text-sm font-semibold text-gray-500">
                          {formatDeliveryDate(order.delivery_date)}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-black text-orange-600">${order.total.toFixed(2)}</div>
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold capitalize text-gray-800">
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        <OrderFulfillmentBadge order={order} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
