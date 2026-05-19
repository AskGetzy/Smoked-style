'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { Order } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { formatDeliveryDate } from '@/lib/dates'

const TABS = ['all', 'pending', 'approved', 'delivered']

function matchesSearch(order: Order, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const customer = order.customers as { full_name?: string; phone?: string; email?: string } | undefined
  const phoneDigits = customer?.phone?.replace(/\D/g, '') ?? ''
  const queryDigits = q.replace(/\D/g, '')
  return (
    order.order_number?.toLowerCase().includes(q) ||
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
    if (requested && TABS.includes(requested)) {
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
                className={`min-h-12 rounded-full px-5 text-base font-black capitalize ${status === tab ? 'text-white' : 'bg-white text-gray-700'}`}
                style={status === tab ? { background: 'var(--navy)' } : undefined}
              >
                {tab}
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
                      <div className="mt-1 text-lg font-black">{customer?.full_name ?? 'Guest'}</div>
                      {customer?.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="block min-h-8 text-base font-bold text-blue-700"
                        >
                          {customer.phone}
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
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-black capitalize">
                        {order.status.replace(/_/g, ' ')}
                      </span>
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
