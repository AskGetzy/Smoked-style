'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import DashboardOrderList, { type DashboardOrder } from '@/components/DashboardOrderList'
import SlideOverPanel from '@/components/SlideOverPanel'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { isCreatedOnLocalDate, todayLocal } from '@/lib/dates'

type LowStockProduct = {
  id: string
  name: string
  stock_quantity: number
  low_stock_threshold: number
}

type ModalKind = 'revenue' | 'approved' | 'lowStock' | null

const APPROVED_STATUSES = ['approved', 'ready_for_pickup', 'out_for_delivery', 'delivered']

export default function BossDashboardPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalKind>(null)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { void loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    const res = await fetchWithAuth('/api/boss/dashboard')
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLowStockProducts(data.lowStockProducts ?? [])
    setLoading(false)
  }

  const today = todayLocal()
  const todayOrders = useMemo(
    () => orders.filter(order => order.created_at && isCreatedOnLocalDate(order.created_at, today)),
    [orders, today],
  )
  const todayApprovedOrders = useMemo(
    () => todayOrders.filter(order => APPROVED_STATUSES.includes(order.status)),
    [todayOrders],
  )
  const todayRevenue = todayOrders
    .filter(order => order.status !== 'cancelled')
    .reduce((sum, order) => sum + Number(order.total), 0)
  const pendingCount = orders.filter(order => order.status === 'pending').length
  const approvedCount = todayApprovedOrders.length

  function openModal(kind: ModalKind) {
    setModal(kind)
    setModalLoading(true)
    window.setTimeout(() => setModalLoading(false), 150)
  }

  const modalTitle =
    modal === 'revenue' ? "Today's orders"
    : modal === 'approved' ? "Today's approved orders"
    : modal === 'lowStock' ? 'Low stock items'
    : ''

  const modalContent =
    modal === 'revenue' ? (
      <DashboardOrderList orders={todayApprovedOrders} emptyMessage="No approved orders today." />
    ) : modal === 'approved' ? (
      <DashboardOrderList orders={todayApprovedOrders} emptyMessage="No approved orders today." />
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
      label: 'Today Revenue',
      value: `$${todayRevenue.toFixed(2)}`,
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
      label: 'Approved Orders',
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
