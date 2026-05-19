'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Order } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { formatDeliveryDate } from '@/lib/dates'

const TABS = ['all', 'pending', 'approved', 'delivered']

export default function BossOrdersPage() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState('all')
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

  const filtered = status === 'all' ? orders : orders.filter(order => order.status === status)

  return (
    <div className="p-4">
      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setStatus(tab)} className={`min-h-12 rounded-full px-5 text-base font-black capitalize ${status === tab ? 'text-white' : 'bg-white text-gray-700'}`} style={status === tab ? { background: 'var(--navy)' } : {}}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-3xl bg-gray-200" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const customer = order.customers as any
            const items = (order.order_items ?? []) as any[]
            return (
              <Link key={order.id} href={`/boss/orders/${order.id}`}>
                <div className={`rounded-3xl bg-white p-4 shadow-sm ${order.status === 'pending' ? 'border-2 border-orange-400' : 'border border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black">{customer?.full_name ?? 'Guest'}</div>
                      {customer?.phone && <a href={`tel:${customer.phone}`} onClick={e => e.stopPropagation()} className="block min-h-8 text-base font-bold text-blue-700">{customer.phone}</a>}
                      <div className="mt-1 text-sm text-gray-500">{items.slice(0, 3).map(item => `${item.quantity}x ${item.product_name}`).join(', ') || order.order_number}</div>
                      {order.delivery_date && <div className="mt-1 text-sm font-semibold text-gray-500">{formatDeliveryDate(order.delivery_date)}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-orange-600">${order.total.toFixed(2)}</div>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-black capitalize">{order.status.replace('_', ' ')}</span>
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
