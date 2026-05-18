'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/types'

const GROUPS: Record<string, string> = {
  jerky: 'Jerky by flavor',
  steaks: 'Steaks by cut',
  smoked: 'Smoked by item',
  non_smoked: 'Non-Smoked by item',
  boards: 'Boards by type and size',
}

function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return next.toISOString().split('T')[0]
}

function buildGroups(orders: Order[]) {
  const grouped: Record<string, Record<string, number>> = {}
  orders.flatMap(order => order.order_items ?? []).forEach((item: any) => {
    const category = item.product_name.toLowerCase().includes('jerky') ? 'jerky' : 'items'
    const group = GROUPS[category] ?? 'Items'
    const key = [item.product_name, item.selected_flavor, item.selected_weight && `${item.selected_weight} lb`, item.selected_size].filter(Boolean).join(' — ')
    grouped[group] ??= {}
    grouped[group][key] = (grouped[group][key] ?? 0) + Number(item.quantity)
  })
  return grouped
}

export default function BossProductionPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => { void loadOrders() }, [])

  async function loadOrders() {
    const res = await fetch('/api/admin/orders', { credentials: 'include', cache: 'no-store' })
    const data = await res.json()
    setOrders(data.orders ?? [])
  }

  const todaysOrders = orders.filter(order => order.delivery_date === date)
  const confirmed = todaysOrders.filter(order => ['approved', 'ready_for_pickup', 'out_for_delivery', 'delivered'].includes(order.status))
  const pending = todaysOrders.filter(order => order.status === 'pending')
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  function Section({ title, source }: { title: string; source: Order[] }) {
    const groups = buildGroups(source)
    return (
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-black">{title}</h2>
        {Object.keys(groups).length === 0 ? <p className="text-base text-gray-400">Nothing for this section.</p> : Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-5 last:mb-0">
            <h3 className="mb-2 text-lg font-black text-orange-700">{group}</h3>
            {Object.entries(items).map(([name, qty]) => (
              <div key={name} className="flex justify-between border-b py-3 text-lg">
                <span className="font-bold">{name}</span>
                <span className="font-black">{qty}</span>
              </div>
            ))}
          </div>
        ))}
      </section>
    )
  }

  return (
    <div className="space-y-4 p-4 text-base">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setDate(shiftDate(date, -1))} className="min-h-12 rounded-2xl bg-gray-100 px-4 text-xl font-black">‹</button>
          <div className="text-center text-lg font-black">{dateLabel}</div>
          <button onClick={() => setDate(shiftDate(date, 1))} className="min-h-12 rounded-2xl bg-gray-100 px-4 text-xl font-black">›</button>
        </div>
        <button onClick={() => window.print()} className="min-h-12 w-full rounded-2xl text-base font-black text-white" style={{ background: 'var(--navy)' }}>Print</button>
      </div>

      <Section title="Confirmed" source={confirmed} />
      <Section title="Pending" source={pending} />
    </div>
  )
}
