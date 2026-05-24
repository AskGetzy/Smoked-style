'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Order } from '@/types'
import BulkPrintModal from '@/components/BulkPrintModal'
import ProductionOrdersPanel from '@/components/ProductionOrdersPanel'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { addLocalDays, formatDeliveryDate, normalizeDeliveryDate, todayLocal } from '@/lib/dates'
import {
  bossProductionItemKey,
  ordersContainingProduct,
  type ProductionOrderRow,
} from '@/lib/production-items'

const GROUPS: Record<string, string> = {
  jerky: 'Jerky by flavor',
  steaks: 'Steaks by cut',
  smoked: 'Smoked by item',
  non_smoked: 'Non-Smoked by item',
  boards: 'Boards by type and size',
}

function buildGroups(orders: Order[]) {
  const grouped: Record<string, Record<string, number>> = {}
  orders.flatMap(order => order.order_items ?? []).forEach((item: any) => {
    const category = item.product_name.toLowerCase().includes('jerky') ? 'jerky' : 'items'
    const group = GROUPS[category] ?? 'Items'
    const key = bossProductionItemKey(item)
    grouped[group] ??= {}
    grouped[group][key] = (grouped[group][key] ?? 0) + Number(item.quantity)
  })
  return grouped
}

export default function BossProductionPage() {
  const [date, setDate] = useState(todayLocal())
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [panelRows, setPanelRows] = useState<ProductionOrderRow[]>([])
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false)

  useEffect(() => { void loadOrders() }, [])

  async function loadOrders() {
    setLoading(true)
    const res = await fetchWithAuth('/api/admin/orders')
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }

  const todaysOrders = useMemo(
    () => orders.filter(order => normalizeDeliveryDate(order.delivery_date) === date),
    [orders, date],
  )
  const confirmed = useMemo(
    () => todaysOrders.filter(order => ['approved', 'ready_for_pickup', 'out_for_delivery', 'delivered'].includes(order.status)),
    [todaysOrders],
  )
  const pending = useMemo(
    () => todaysOrders.filter(order => order.status === 'pending'),
    [todaysOrders],
  )
  const dateLabel = formatDeliveryDate(date, { weekday: 'long', month: 'long', day: 'numeric' })

  function openProductPanel(productKey: string, sourceOrders: Order[]) {
    setSelectedProduct(productKey)
    setPanelOpen(true)
    setPanelLoading(true)
    const rows = ordersContainingProduct(sourceOrders, productKey, bossProductionItemKey)
    setPanelRows(rows)
    setPanelLoading(false)
  }

  function Section({ title, source }: { title: string; source: Order[] }) {
    const groups = buildGroups(source)
    return (
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-black">{title}</h2>
        {Object.keys(groups).length === 0 ? (
          <p className="text-base text-gray-400">Nothing for this section.</p>
        ) : (
          Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-lg font-black text-orange-700">{group}</h3>
              {Object.entries(items).map(([name, qty]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => openProductPanel(name, source)}
                  className="flex w-full justify-between border-b py-3 text-left text-lg hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="font-bold">{name}</span>
                  <span className="font-black">{qty}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </section>
    )
  }

  return (
    <div className="space-y-4 p-4 text-base">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setDate(addLocalDays(date, -1))} className="min-h-12 rounded-2xl bg-gray-100 px-4 text-xl font-black">‹</button>
          <div className="text-center text-lg font-black">{dateLabel}</div>
          <button onClick={() => setDate(addLocalDays(date, 1))} className="min-h-12 rounded-2xl bg-gray-100 px-4 text-xl font-black">›</button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setBulkPrintOpen(true)}
            className="min-h-12 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-base font-black text-gray-800 shadow-sm"
          >
            Bulk Print Labels
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-12 flex-1 rounded-2xl text-base font-black text-white"
            style={{ background: 'var(--navy)' }}
          >
            Print
          </button>
        </div>
      </div>

      <BulkPrintModal
        open={bulkPrintOpen}
        onClose={() => setBulkPrintOpen(false)}
        defaultDeliveryDate={date}
      />

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-3xl bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
        </div>
      ) : (
        <>
          <Section title="Confirmed" source={confirmed} />
          <Section title="Pending" source={pending} />
        </>
      )}

      <ProductionOrdersPanel
        open={panelOpen}
        productName={selectedProduct ?? ''}
        rows={panelRows}
        loading={panelLoading}
        orderDetailBasePath="/boss/orders"
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
}
