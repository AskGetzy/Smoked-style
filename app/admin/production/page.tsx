'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'

interface ProductionItem { name: string; qty: number; unit: string }

export default function ProductionPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [confirmed, setConfirmed] = useState<ProductionItem[]>([])
  const [pending, setPending] = useState<ProductionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProduction() }, [date])

  async function fetchProduction() {
    setLoading(true)
    const { data: orders } = await supabase
      .from('orders')
      .select('status, order_items(product_name, quantity, selected_weight, selected_flavor)')
      .eq('delivery_date', date)
      .in('status', ['pending', 'approved'])

    const tally = (items: any[]) => {
      const map: Record<string, { qty: number; unit: string }> = {}
      items.forEach(item => {
        const key = [item.product_name, item.selected_flavor, item.selected_weight && `${item.selected_weight}lb`].filter(Boolean).join(' — ')
        const unit = item.selected_weight ? 'lb' : 'pcs'
        const qty = item.selected_weight ? item.quantity * item.selected_weight : item.quantity
        if (!map[key]) map[key] = { qty: 0, unit }
        map[key].qty += qty
      })
      return Object.entries(map).map(([name, v]) => ({ name, ...v }))
    }

    const allItems = (orders ?? []).flatMap((o: any) => o.order_items ?? [])
    const confirmedItems = (orders ?? []).filter((o: any) => o.status === 'approved').flatMap((o: any) => o.order_items ?? [])
    const pendingItems = (orders ?? []).filter((o: any) => o.status === 'pending').flatMap((o: any) => o.order_items ?? [])

    setConfirmed(tally(confirmedItems))
    setPending(tally(pendingItems))
    setLoading(false)
  }

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Production</h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
        </div>

        <p className="text-gray-500 text-sm mb-6">{dateLabel}</p>

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
                Confirmed Orders ({confirmed.length} items)
              </h3>
              {confirmed.length === 0
                ? <p className="text-gray-400 text-sm">No confirmed orders for this date</p>
                : confirmed.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="font-bold text-sm text-gray-900">{item.qty} {item.unit}</span>
                  </div>
                ))
              }
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-bold text-yellow-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                Pending Orders ({pending.length} items)
              </h3>
              {pending.length === 0
                ? <p className="text-gray-400 text-sm">No pending orders for this date</p>
                : pending.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="font-bold text-sm text-yellow-700">{item.qty} {item.unit}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
