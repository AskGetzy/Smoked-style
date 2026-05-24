'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import OverviewTab from '@/components/bookkeeping/OverviewTab'
import IncomeTab from '@/components/bookkeeping/IncomeTab'
import ExpensesTab from '@/components/bookkeeping/ExpensesTab'
import PayrollTab from '@/components/bookkeeping/PayrollTab'
import { resolveDateRange, type BookkeepingDateRange, type DateRangePreset } from '@/lib/bookkeeping'

const TABS = ['overview', 'income', 'expenses', 'payroll'] as const
type Tab = (typeof TABS)[number]

export default function BookkeepingPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [range, setRange] = useState<BookkeepingDateRange>(() => resolveDateRange('month'))

  useEffect(() => {
    fetch('/api/admin/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.isOwner) setAuthorized(true)
        else router.replace('/admin/orders')
      })
      .catch(() => router.replace('/admin/orders'))
  }, [router])

  function handleRangeChange(preset: DateRangePreset, start?: string, end?: string) {
    setRange(resolveDateRange(preset, start, end))
  }

  if (authorized === null) {
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-gray-500">Checking access…</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--navy)' }}>Bookkeeping</h1>
        <p className="mb-6 text-sm text-gray-500">Owner only — income, expenses, payroll, and exports</p>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                tab === t ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={tab === t ? { background: 'var(--navy)' } : undefined}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab range={range} onRangeChange={handleRangeChange} />}
        {tab === 'income' && <IncomeTab range={range} onRangeChange={handleRangeChange} />}
        {tab === 'expenses' && <ExpensesTab range={range} onRangeChange={handleRangeChange} />}
        {tab === 'payroll' && <PayrollTab range={range} onRangeChange={handleRangeChange} />}
      </div>
    </AdminLayout>
  )
}
