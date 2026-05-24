'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import CustomerImportPanel from '@/components/CustomerImportPanel'
import { useLanguage } from '@/lib/language-context'
import type { Customer } from '@/types'

const TAG_COLORS: Record<string, string> = {
  vip: 'bg-amber-100 text-amber-800',
  wholesale: 'bg-blue-100 text-blue-800',
  event_customer: 'bg-purple-100 text-purple-800',
}

type CustomerRow = Customer & { order_count: number; total_spent: number }

export default function CustomersPage() {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchCustomers()
  }, [])

  async function fetchCustomers() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/customers', { credentials: 'include', cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'Could not load customers')
      setCustomers([])
      setLoading(false)
      return
    }
    setCustomers(data.customers ?? [])
    setLoading(false)
  }

  const filtered = customers.filter(c =>
    search === '' ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--navy)' }}>{t.customers}</h1>

        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchByNameOrEmail}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
          />
        </div>

        <CustomerImportPanel variant="admin" onComplete={() => void fetchCustomers()} />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">👥</div>
            <p>{error ? t.noResults : t.noCustomersYet}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">{t.customer}</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs uppercase">{t.tagsLabel}</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold text-xs uppercase">{t.ordersColumn}</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold text-xs uppercase">{t.spentColumn}</th>
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
