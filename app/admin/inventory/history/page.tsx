'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { fetchWithAuth } from '@/lib/auth-fetch'

type HistoryRow = {
  id: string
  product_id: string
  change_amount: number
  previous_quantity: number
  new_quantity: number
  reason: string | null
  created_at: string
  products: { name: string } | null
}

export default function StockHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const res = await fetchWithAuth('/api/admin/inventory/history')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Could not load stock history')
      setLoading(false)
      return
    }
    setRows(data.history ?? [])
    setLoading(false)
  }

  const filtered = search
    ? rows.filter(r => (r.products?.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : rows

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin/inventory" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Stock History</h1>
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by product name"
          className="mb-4 w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📉</div>
            <p>No stock changes recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Product</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Change</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Previous &rarr; New</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">Reason</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.products?.name ?? 'Unknown product'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${row.change_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.change_amount > 0 ? '+' : ''}{row.change_amount}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.previous_quantity} &rarr; {row.new_quantity}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
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
