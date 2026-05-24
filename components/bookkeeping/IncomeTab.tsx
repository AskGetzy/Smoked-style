'use client'

import { useEffect, useState } from 'react'
import type { BookkeepingDateRange } from '@/lib/bookkeeping'
import DateRangePicker from '@/components/bookkeeping/DateRangePicker'

type IncomeRow = {
  id: string
  date: string
  order_number: string
  customer_name: string
  area: string
  items: string
  total: number
}

type Props = {
  range: BookkeepingDateRange
  onRangeChange: (preset: BookkeepingDateRange['preset'], start?: string, end?: string) => void
}

function qs(range: BookkeepingDateRange, area: string, category: string) {
  return `preset=${range.preset}&start=${range.start}&end=${range.end}&area=${area}&category=${category}`
}

export default function IncomeTab({ range, onRangeChange }: Props) {
  const [rows, setRows] = useState<IncomeRow[]>([])
  const [total, setTotal] = useState(0)
  const [byCategory, setByCategory] = useState<Record<string, number>>({})
  const [byArea, setByArea] = useState<Record<string, number>>({})
  const [byWeek, setByWeek] = useState<Record<string, number>>({})
  const [byMonth, setByMonth] = useState<Record<string, number>>({})
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([])
  const [area, setArea] = useState('all')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void load()
  }, [range, area, category])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/bookkeeping/income?${qs(range, area, category)}`, { credentials: 'include' })
    const json = await res.json()
    if (res.ok) {
      setRows(json.rows ?? [])
      setTotal(json.total ?? 0)
      setByCategory(json.byCategory ?? {})
      setByArea(json.byArea ?? {})
      setByWeek(json.byWeek ?? {})
      setByMonth(json.byMonth ?? {})
      setAreas(json.areas ?? [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <DateRangePicker range={range} onChange={onRangeChange} />
      <div className="flex flex-wrap gap-3">
        <select value={area} onChange={e => setArea(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">All delivery areas</option>
          {areas.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">All categories</option>
          {['jerky', 'steaks', 'smoked', 'non_smoked', 'boards'].map(c => (
            <option key={c} value={c}>{c.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 font-medium">{row.order_number}</td>
                    <td className="px-4 py-3">{row.customer_name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-600">{row.items}</td>
                    <td className="px-4 py-3 text-right font-bold">${row.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-right">Total</td>
                  <td className="px-4 py-3 text-right">${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Breakdown title="By category" data={byCategory} />
            <Breakdown title="By delivery area" data={byArea} />
            <Breakdown title="By week" data={byWeek} />
            <Breakdown title="By month" data={byMonth} />
          </div>
        </>
      )}
    </div>
  )
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a)
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h4 className="mb-2 font-semibold text-gray-800">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No data</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map(([key, value]) => (
            <li key={key} className="flex justify-between">
              <span className="capitalize text-gray-600">{key.replace(/_/g, ' ')}</span>
              <span className="font-semibold">${value.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
