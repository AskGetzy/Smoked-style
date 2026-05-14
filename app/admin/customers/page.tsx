'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types'

const TAG_COLORS: Record<string, string> = {
  vip: 'bg-amber-100 text-amber-800',
  wholesale: 'bg-blue-100 text-blue-800',
  event_customer: 'bg-purple-100 text-purple-800',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<(Customer & { order_count: number; total_spent: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    if (!data) { setLoading(false); return }

    const enriched = await Promise.all(data.map(async c => {
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('customer_id', c.id)
      const { data: orders } = await supabase.from('orders').select('total').eq('customer_id', c.id).eq('status', 'delivered')
      const total_spent = (orders ?? []).reduce((s: number, o: any) => s + o.total, 0)
      return { ...c, order_count: count ?? 0, total_spent }
    }))

    setCustomers(enriched)
    setLoading(false)
  }

  const filtered = customers.filter(c =>
    search === '' ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--navy)' }}>Customers</h1>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-orange-400" />

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">👥</div>
            <p>No customers yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Tags</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Orders</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{c.full_name}</p>
                      <p className="text-gray-400 text-xs">{c.email}</p>
                      {c.phone && <p className="text-gray-400 text-xs">{c.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).map(tag => (
                          <span key={tag} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'}`}>
                            {tag.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--orange)' }}>
                      ${c.total_spent.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
