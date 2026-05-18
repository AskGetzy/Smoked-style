'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type DashboardOrder = { status: string; total: number; created_at: string }

export default function BossDashboardPage() {
  const [orders, setOrders] = useState<DashboardOrder[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => { void loadDashboard() }, [])

  async function loadDashboard() {
    const res = await fetch('/api/boss/dashboard', { credentials: 'include', cache: 'no-store' })
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLowStockCount(data.lowStockCount ?? 0)
  }

  const today = new Date().toISOString().split('T')[0]
  const todayRevenue = orders
    .filter(order => order.created_at?.startsWith(today) && order.status !== 'cancelled')
    .reduce((sum, order) => sum + Number(order.total), 0)
  const pendingCount = orders.filter(order => order.status === 'pending').length
  const approvedCount = orders.filter(order => ['approved', 'ready_for_pickup', 'out_for_delivery'].includes(order.status)).length

  const cards = [
    ['Today Revenue', `$${todayRevenue.toFixed(2)}`],
    ['Pending Orders', String(pendingCount)],
    ['Approved Orders', String(approvedCount)],
    ['Low Stock Items', String(lowStockCount)],
  ]

  return (
    <div className="space-y-4 p-4 text-base">
      {pendingCount > 0 && (
        <Link href="/boss/orders" className="block rounded-3xl bg-orange-500 p-5 text-xl font-black text-white shadow-lg">
          {pendingCount} orders need approval
        </Link>
      )}

      <div className="grid grid-cols-1 gap-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="text-base font-bold text-gray-500">{label}</div>
            <div className="mt-2 text-4xl font-black" style={{ color: 'var(--navy)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
