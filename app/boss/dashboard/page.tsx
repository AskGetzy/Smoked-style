'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import DashboardOrderList, { type DashboardOrder } from '@/components/DashboardOrderList'
import OrderFulfillmentSummary from '@/components/OrderFulfillmentSummary'
import SlideOverPanel from '@/components/SlideOverPanel'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { addLocalDays, formatDeliveryDate, todayLocal } from '@/lib/dates'
import { orderMatchesFulfillmentFilter, type FulfillmentFilter } from '@/lib/order-fulfillment-summary'
import type { Order } from '@/types'

type LowStockProduct = {
  id: string
  name: string
  stock_quantity: number
  low_stock_threshold: number
}

type ModalKind = 'revenue' | 'approved' | 'lowStock' | null

export default function BossDashboardPage() {
  const router = useRouter()
  const [date, setDate] = useState(todayLocal())
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [dateOrders, setDateOrders] = useState<Order[]>([])
  const [dateOrdersLoading, setDateOrdersLoading] = useState(false)
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalKind>(null)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { void loadDashboard() }, [])

  useEffect(() => {
    void loadDateOrders()
  }, [date])

  async function loadDashboard() {
    setLoading(true)
    const res = await fetchWithAuth('/api/boss/dashboard')
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLowStockProducts(data.lowStockProducts ?? [])
    setLoading(false)
  }

  async function loadDateOrders() {
    setDateOrdersLoading(true)
    setFulfillmentFilter(null)
    try {
      const res = await fetchWithAuth(
        `/api/admin/orders?delivery_date=${encodeURIComponent(date)}`,
      )
      const data = await res.json()
      setDateOrders(res.ok ? ((data.orders ?? []) as Order[]) : [])
    } finally {
      setDateOrdersLoading(false)
    }
  }

  const ordersForDate = useMemo(
    () => dateOrders.filter(order => orderMatchesFulfillmentFilter(order, fulfillmentFilter)),
    [dateOrders, fulfillmentFilter],
  )
  const revenueOrders = useMemo(
    () => dateOrders.filter(order => order.status !== 'cancelled'),
    [dateOrders],
  )
  const allApprovedOrders = useMemo(
    () => orders.filter(order => order.status === 'approved'),
    [orders],
  )
  const dateRevenue = revenueOrders.reduce((sum, order) => sum + Number(order.total), 0)
  const pendingCount = orders.filter(order => order.status === 'pending').length
  const approvedCount = orders.filter(order => order.status === 'approved').length
  const dateLabel = formatDeliveryDate(date, { weekday: 'long', month: 'long', day: 'numeric' })

  function openModal(kind: ModalKind) {
    setModal(kind)
    setModalLoading(true)
    window.setTimeout(() => setModalLoading(false), 150)
  }

  const modalTitle =
    modal === 'revenue' ? `Orders for ${dateLabel}`
    : modal === 'approved' ? `Approved on ${dateLabel}`
    : modal === 'lowStock' ? 'Low stock items'
    : ''

  const modalContent =
    modal === 'revenue' ? (
      <DashboardOrderList orders={revenueOrders} emptyMessage="No orders scheduled for this date." />
    ) : modal === 'approved' ? (
      <DashboardOrderList orders={allApprovedOrders} emptyMessage="No approved orders." />
    ) : modal === 'lowStock' ? (
      lowStockProducts.length === 0 ? (
        <p className="text-base text-gray-500">All products are above the low stock threshold.</p>
      ) : (
        <ul className="space-y-3">
          {lowStockProducts.map(product => (
            <li key={product.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <span className="text-base font-bold">{product.name}</span>
              <span className="text-base font-black text-red-600">
                {product.stock_quantity} left
              </span>
            </li>
          ))}
        </ul>
      )
    ) : null

  const cards = [
    {
      key: 'revenue',
      label: 'Revenue (by delivery date)',
      value: `$${dateRevenue.toFixed(2)}`,
      onClick: () => openModal('revenue'),
    },
    {
      key: 'pending',
      label: 'Pending Orders',
      value: String(pendingCount),
      onClick: () => router.push('/boss/orders?status=pending'),
    },
    {
      key: 'approved',
      label: 'Approved (all dates)',
      value: String(approvedCount),
      onClick: () => openModal('approved'),
    },
    {
      key: 'lowStock',
      label: 'Low Stock Items',
      value: String(lowStockProducts.length),
      onClick: () => openModal('lowStock'),
    },
  ] as const

  return (
    <div className="space-y-4 p-4 text-base">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-1 text-sm font-bold text-gray-500">Delivery date</div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDate(addLocalDays(date, -1))}
            className="min-h-12 rounded-2xl bg-gray-100 px-4 text-xl font-black"
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className="text-center text-lg font-black leading-tight">{dateLabel}</div>
          <button
            type="button"
            onClick={() => setDate(addLocalDays(date, 1))}
            className="min-h-12 rounded-2xl bg-gray-100 px-4 text-xl font-black"
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        {date !== todayLocal() && (
          <button
            type="button"
            onClick={() => setDate(todayLocal())}
            className="mt-3 min-h-10 w-full rounded-2xl text-sm font-black text-orange-700 ring-1 ring-orange-200"
          >
            Jump to today
          </button>
        )}
      </div>

      {pendingCount > 0 && (
        <Link href="/boss/orders?status=pending" className="block rounded-3xl bg-orange-500 p-5 text-xl font-black text-white shadow-lg">
          {pendingCount} orders need approval
        </Link>
      )}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-3xl bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {cards.map(card => (
              <button
                key={card.key}
                type="button"
                onClick={card.onClick}
                className="rounded-3xl bg-white p-5 text-left shadow-sm transition hover:ring-2 hover:ring-orange-200 active:scale-[0.99]"
              >
                <div className="text-base font-bold text-gray-500">{card.label}</div>
                <div className="mt-2 text-4xl font-black" style={{ color: 'var(--navy)' }}>{card.value}</div>
              </button>
            ))}
          </div>

          <OrderFulfillmentSummary
            date={date}
            onDateChange={setDate}
            orders={dateOrders}
            loading={dateOrdersLoading}
            activeFilter={fulfillmentFilter}
            onFilterChange={setFulfillmentFilter}
            variant="boss"
          />

          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black">Orders for this date</h2>
              {fulfillmentFilter && (
                <button
                  type="button"
                  onClick={() => setFulfillmentFilter(null)}
                  className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white"
                >
                  Clear filter
                </button>
              )}
            </div>
            {dateOrdersLoading ? (
              <p className="text-base text-gray-500">Loading orders…</p>
            ) : (
              <DashboardOrderList
                orders={ordersForDate}
                emptyMessage={
                  fulfillmentFilter
                    ? 'No orders match this filter for this date.'
                    : 'No orders scheduled for this delivery date.'
                }
              />
            )}
          </section>
        </>
      )}

      <SlideOverPanel
        open={modal !== null}
        title={modalTitle}
        loading={modalLoading}
        onClose={() => setModal(null)}
      >
        {modalContent}
      </SlideOverPanel>
    </div>
  )
}
