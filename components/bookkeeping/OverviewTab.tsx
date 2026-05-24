'use client'

import { useEffect, useState } from 'react'
import type { BookkeepingDateRange } from '@/lib/bookkeeping'
import DateRangePicker from '@/components/bookkeeping/DateRangePicker'

type OverviewData = {
  totalIncome: number
  totalExpenses: number
  totalPayroll: number
  netProfit: number
  chart: { week: string; income: number; expenses: number; payroll: number; net: number }[]
}

type Props = {
  range: BookkeepingDateRange
  onRangeChange: (preset: BookkeepingDateRange['preset'], start?: string, end?: string) => void
}

function queryString(range: BookkeepingDateRange) {
  return `preset=${range.preset}&start=${range.start}&end=${range.end}`
}

export default function OverviewTab({ range, onRangeChange }: Props) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void load()
  }, [range])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/bookkeeping/overview?${queryString(range)}`, { credentials: 'include' })
    const json = await res.json()
    if (res.ok) setData(json)
    setLoading(false)
  }

  const maxBar = Math.max(
    ...(data?.chart.map(c => Math.max(c.income, c.expenses + c.payroll, Math.abs(c.net))) ?? [1]),
    1,
  )

  function downloadExport(format: 'csv' | 'iif', report = 'combined') {
    window.location.href = `/api/bookkeeping/export?format=${format}&report=${report}&${queryString(range)}`
  }

  return (
    <div className="space-y-6">
      <DateRangePicker range={range} onChange={onRangeChange} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadExport('csv')}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Export to CSV
        </button>
        <button
          type="button"
          onClick={() => downloadExport('iif')}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--navy)' }}
        >
          Export to QuickBooks
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Income', value: data.totalIncome, color: 'text-green-700' },
              { label: 'Total Expenses', value: data.totalExpenses, color: 'text-red-600' },
              { label: 'Total Payroll', value: data.totalPayroll, color: 'text-orange-600' },
              { label: 'Net Profit', value: data.netProfit, color: data.netProfit >= 0 ? 'text-green-800' : 'text-red-700' },
            ].map(card => (
              <div key={card.label} className="rounded-xl border border-gray-100 bg-white p-4">
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`mt-1 text-2xl font-black ${card.color}`}>${card.value.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="mb-4 font-semibold text-gray-900">Profit / loss by week</h3>
            {data.chart.length === 0 ? (
              <p className="text-sm text-gray-400">No data for this period.</p>
            ) : (
              <div className="space-y-3">
                {data.chart.map(row => (
                  <div key={row.week}>
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>Week of {row.week}</span>
                      <span className={row.net >= 0 ? 'text-green-700' : 'text-red-600'}>
                        Net ${row.net.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex h-8 gap-1">
                      <div
                        className="rounded bg-green-500"
                        style={{ width: `${(row.income / maxBar) * 100}%` }}
                        title={`Income $${row.income.toFixed(2)}`}
                      />
                      <div
                        className="rounded bg-red-400"
                        style={{ width: `${((row.expenses + row.payroll) / maxBar) * 100}%` }}
                        title={`Costs $${(row.expenses + row.payroll).toFixed(2)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
