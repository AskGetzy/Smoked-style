'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminLayout from '@/components/AdminLayout'
import BulkPrintModal from '@/components/BulkPrintModal'
import OrderFulfillmentBadge from '@/components/OrderFulfillmentBadge'
import OrderFulfillmentSummary from '@/components/OrderFulfillmentSummary'
import { formatDeliveryDate, formatOrderDate, normalizeDeliveryDate, todayLocal } from '@/lib/dates'
import {
  orderMatchesFulfillmentFilter,
  type FulfillmentFilter,
} from '@/lib/order-fulfillment-summary'
import { useLanguage } from '@/lib/language-context'
import { orderStatusLabel } from '@/lib/i18n'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { displayBuyerName } from '@/lib/order-buyer'
import type { Order } from '@/types'

const STATUS_TABS = [
  'all',
  'pending',
  'approved',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
]
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  ready_for_pickup: 'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function statusTabLabel(tab: string, t: ReturnType<typeof useLanguage>['t']) {
  if (tab === 'all') return t.all
  return orderStatusLabel(t, tab)
}

export default function OrdersPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false)
  const [summaryDate, setSummaryDate] = useState(todayLocal)
  const [summaryOrders, setSummaryOrders] = useState<Order[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter | null>(null)
  const hasLoadedOrdersRef = useRef(false)
  const fetchInFlightRef = useRef(false)

  const fetchOrders = useCallback(async () => {
    if (fetchInFlightRef.current) return
    fetchInFlightRef.current = true

    const isInitialLoad = !hasLoadedOrdersRef.current
    if (isInitialLoad) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError('')

    try {
      const res = await fetchWithAuth('/api/admin/orders')
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? t.couldNotLoadOrders)
        if (isInitialLoad) setOrders([])
      } else {
        setOrders((payload.orders ?? []) as Order[])
        hasLoadedOrdersRef.current = true
      }
    } finally {
      fetchInFlightRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }, [t.couldNotLoadOrders])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  const fetchSummaryOrders = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetchWithAuth(
        `/api/admin/orders?delivery_date=${encodeURIComponent(summaryDate)}`,
      )
      const payload = await res.json()
      if (res.ok) {
        setSummaryOrders((payload.orders ?? []) as Order[])
      } else {
        setSummaryOrders([])
      }
    } finally {
      setSummaryLoading(false)
    }
  }, [summaryDate])

  useEffect(() => {
    void fetchSummaryOrders()
  }, [fetchSummaryOrders])

  useEffect(() => {
    const supabase = createClientComponentClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        void fetchOrders()
        void fetchSummaryOrders()
      }, 400)
    }

    const pollingFallback = setInterval(scheduleRefresh, 15000)

    const channel = supabase
      .channel('orders-list-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(pollingFallback)
      void supabase.removeChannel(channel)
    }
  }, [fetchOrders, fetchSummaryOrders])

  const filtered = orders.filter(o => {
    const matchTab = activeTab === 'all' || o.status === activeTab
    const matchSearch =
      search === '' ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      displayBuyerName(o).toLowerCase().includes(search.toLowerCase())
    const matchSummaryDate =
      normalizeDeliveryDate(o.delivery_date) === summaryDate
    const matchFulfillment =
      !fulfillmentFilter ||
      (matchSummaryDate && orderMatchesFulfillmentFilter(o, fulfillmentFilter))

    if (fulfillmentFilter) {
      return matchTab && matchSearch && matchFulfillment
    }
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>{t.orders}</h1>
            {refreshing && (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500"
                aria-hidden
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBulkPrintOpen(true)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm hover:border-orange-200"
            >
              Bulk Print Labels
            </button>
            <div className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
              {counts.pending} {t.pending}
            </div>
            <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              {counts.approved} {t.approved}
            </div>
          </div>
        </div>

        <BulkPrintModal open={bulkPrintOpen} onClose={() => setBulkPrintOpen(false)} />

        <OrderFulfillmentSummary
          date={summaryDate}
          onDateChange={setSummaryDate}
          orders={summaryOrders}
          loading={summaryLoading}
          activeFilter={fulfillmentFilter}
          onFilterChange={setFulfillmentFilter}
          variant="admin"
        />

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.searchOrdersPlaceholder}
          className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
        />

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab ? 'text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={activeTab === tab ? { background: 'var(--navy)' } : {}}
            >
              {statusTabLabel(tab, t)}
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
            <p>{t.noOrdersFound}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <div className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-orange-200 hover:shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="mb-1 font-bold text-gray-900">{order.order_number}</p>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {orderStatusLabel(t, order.status)}
                        </span>
                        <OrderFulfillmentBadge order={order} />
                      </div>
                      <p className="text-sm text-gray-600">{displayBuyerName(order)}</p>
                      {order.created_at && (
                        <p className="text-xs text-gray-400">
                          {t.orderedOn}: {formatOrderDate(order.created_at)}
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
