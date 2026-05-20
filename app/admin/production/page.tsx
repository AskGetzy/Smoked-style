'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import ProductionOrdersPanel from '@/components/ProductionOrdersPanel'
import { formatDeliveryDate, normalizeDeliveryDate, todayLocal } from '@/lib/dates'
import { useLanguage } from '@/lib/language-context'
import {
  adminProductionItemKey,
  ordersContainingProduct,
  tallyProductionItems,
  type ProductionOrderRow,
} from '@/lib/production-items'
import type { Order } from '@/types'

export default function ProductionPage() {
  const { t } = useLanguage()
  const [date, setDate] = useState(todayLocal())
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [panelRows, setPanelRows] = useState<ProductionOrderRow[]>([])
  const loadedDateRef = useRef<string | null>(null)

  useEffect(() => { void fetchProduction() }, [date])

  async function fetchProduction() {
    const isInitialForDate = loadedDateRef.current !== date
    if (isInitialForDate) {
      setLoading(true)
    }
    setError('')

    const res = await fetch('/api/admin/orders', {
      credentials: 'include',
      cache: 'no-store',
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? t.couldNotLoadProduction)
      if (isInitialForDate) setOrders([])
      setLoading(false)
      return
    }

    const filtered = (data.orders ?? []).filter(
      (order: Order) =>
        normalizeDeliveryDate(order.delivery_date) === date &&
        ['pending', 'approved'].includes(order.status),
    )

    setOrders(filtered)
    loadedDateRef.current = date
    setLoading(false)
  }

  const confirmedOrders = useMemo(
    () => orders.filter(order => order.status === 'approved'),
    [orders],
  )
  const pendingOrders = useMemo(
    () => orders.filter(order => order.status === 'pending'),
    [orders],
  )

  const confirmed = useMemo(
    () => tallyProductionItems(
      confirmedOrders.flatMap(order => order.order_items ?? []),
      adminProductionItemKey,
    ),
    [confirmedOrders],
  )
  const pending = useMemo(
    () => tallyProductionItems(
      pendingOrders.flatMap(order => order.order_items ?? []),
      adminProductionItemKey,
    ),
    [pendingOrders],
  )

  function openProductPanel(productKey: string, sourceOrders: Order[]) {
    setSelectedProduct(productKey)
    setPanelOpen(true)
    setPanelLoading(true)
    const rows = ordersContainingProduct(sourceOrders, productKey, adminProductionItemKey)
    setPanelRows(rows)
    setPanelLoading(false)
  }

  const dateLabel = formatDeliveryDate(date, { weekday: 'long', month: 'long', day: 'numeric' })

  function ItemList({
    items,
    sourceOrders,
    qtyClassName,
  }: {
    items: { name: string; qty: number; unit: string }[]
    sourceOrders: Order[]
    qtyClassName: string
  }) {
    if (items.length === 0) {
      return <p className="text-gray-400 text-sm">{t.noOrdersForDate}</p>
    }

    return items.map(item => (
      <button
        key={item.name}
        type="button"
        onClick={() => openProductPanel(item.name, sourceOrders)}
        className="flex w-full justify-between border-b border-gray-50 py-3 text-left last:border-0 hover:bg-gray-50 active:bg-gray-100"
      >
        <span className="text-sm font-medium text-gray-700">{item.name}</span>
        <span className={`text-sm font-bold ${qtyClassName}`}>{item.qty} {item.unit}</span>
      </button>
    ))
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>{t.production}</h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
        </div>

        <p className="text-gray-500 text-sm mb-6">{dateLabel}</p>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {t.confirmedOrdersTitle} ({confirmed.length} {t.itemsCount})
              </h3>
              <ItemList items={confirmed} sourceOrders={confirmedOrders} qtyClassName="text-gray-900" />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-bold text-yellow-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                {t.pendingOrdersTitle} ({pending.length} {t.itemsCount})
              </h3>
              <ItemList items={pending} sourceOrders={pendingOrders} qtyClassName="text-yellow-700" />
            </div>
          </div>
        )}
      </div>

      <ProductionOrdersPanel
        open={panelOpen}
        productName={selectedProduct ?? ''}
        rows={panelRows}
        loading={panelLoading}
        orderDetailBasePath="/admin/orders"
        onClose={() => setPanelOpen(false)}
      />
    </AdminLayout>
  )
}
