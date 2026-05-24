'use client'

import { useEffect, useRef, useState } from 'react'
import { EXPENSE_CATEGORIES, type BookkeepingDateRange } from '@/lib/bookkeeping'
import DateRangePicker from '@/components/bookkeeping/DateRangePicker'

type Expense = {
  id: string
  date: string
  category: string
  description: string | null
  amount: number
  receipt_url: string | null
}

type ScanData = {
  date: string | null
  amount: number | null
  vendor: string | null
  description: string | null
  category: string | null
}

type Props = {
  range: BookkeepingDateRange
  onRangeChange: (preset: BookkeepingDateRange['preset'], start?: string, end?: string) => void
}

function qs(range: BookkeepingDateRange, category: string) {
  return `preset=${range.preset}&start=${range.start}&end=${range.end}&category=${category}`
}

export default function ExpensesTab({ range, onRangeChange }: Props) {
  const [rows, setRows] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [byCategory, setByCategory] = useState<Record<string, number>>({})
  const [byMonth, setByMonth] = useState<Record<string, number>>({})
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [scanBanner, setScanBanner] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const receiptRef = useRef<HTMLInputElement>(null)
  const scanRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Ingredients' as string,
    description: '',
    amount: '',
    receipt_url: '',
  })

  useEffect(() => {
    void load()
  }, [range, categoryFilter])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/bookkeeping/expenses?${qs(range, categoryFilter)}`, { credentials: 'include' })
    const json = await res.json()
    if (res.ok) {
      setRows(json.rows ?? [])
      setTotal(json.total ?? 0)
      setByCategory(json.byCategory ?? {})
      setByMonth(json.byMonth ?? {})
    }
    setLoading(false)
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/bookkeeping/expenses?id=${id}`, { method: 'DELETE', credentials: 'include' })
    void load()
  }

  async function uploadReceipt(file: File) {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch('/api/bookkeeping/upload-receipt', { method: 'POST', body, credentials: 'include' })
    const json = await res.json()
    if (res.ok) setForm(f => ({ ...f, receipt_url: json.url }))
  }

  async function scanReceipt(file: File) {
    setScanning(true)
    setScanBanner(null)
    const body = new FormData()
    body.append('file', file)
    const res = await fetch('/api/bookkeeping/scan-receipt', { method: 'POST', body, credentials: 'include' })
    const json = await res.json()
    setScanning(false)

    if (!res.ok || !json.ok) {
      setScanBanner(json.error ?? 'Could not read receipt. Please fill in manually.')
      return
    }

    const data = json.data as ScanData
    setForm(f => ({
      ...f,
      date: data.date ?? f.date,
      amount: data.amount != null ? String(data.amount) : f.amount,
      description: data.description || data.vendor || f.description,
      category: data.category && EXPENSE_CATEGORIES.includes(data.category as (typeof EXPENSE_CATEGORIES)[number])
        ? data.category
        : f.category,
    }))
    setScanBanner('Receipt scanned! Please review and confirm.')
    void uploadReceipt(file)
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/bookkeeping/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setScanBanner(null)
      setForm({
        date: new Date().toISOString().slice(0, 10),
        category: 'Ingredients',
        description: '',
        amount: '',
        receipt_url: '',
      })
      void load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker range={range} onChange={onRangeChange} />
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--navy)' }}
        >
          {showForm ? 'Cancel' : 'Add expense'}
        </button>
      </div>

      <select
        value={categoryFilter}
        onChange={e => setCategoryFilter(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm"
      >
        <option value="all">All categories</option>
        {EXPENSE_CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {showForm && (
        <form onSubmit={saveExpense} className="space-y-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
          {scanBanner && (
            <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${scanBanner.includes('review') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {scanBanner}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={scanning}
              onClick={() => scanRef.current?.click()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold"
            >
              {scanning ? 'Reading receipt…' : 'Scan receipt'}
            </button>
            <input
              ref={scanRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void scanReceipt(file)
              }}
            />
            <button
              type="button"
              onClick={() => receiptRef.current?.click()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold"
            >
              Upload receipt
            </button>
            <input
              ref={receiptRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void uploadReceipt(file)
              }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Date</span>
              <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Category</span>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2">
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Description</span>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Amount</span>
              <input type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            {form.receipt_url && (
              <p className="text-sm text-green-700 sm:col-span-2">
                <a href={form.receipt_url} target="_blank" rel="noreferrer" className="underline">Receipt attached</a>
              </p>
            )}
          </div>
          <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--navy)' }}>
            {saving ? 'Saving…' : 'Save expense'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3">{row.description ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-bold">${Number(row.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {row.receipt_url ? (
                        <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View</a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => void deleteExpense(row.id)} className="text-red-600 text-xs font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                  <td className="px-4 py-3 text-right">${total.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CategoryBreakdown title="Monthly totals by category" data={byCategory} />
            <CategoryBreakdown title="By month" data={byMonth} />
          </div>
        </>
      )}
    </div>
  )
}

function CategoryBreakdown({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h4 className="mb-2 font-semibold">{title}</h4>
      <ul className="space-y-1 text-sm">
        {Object.entries(data).map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span>{k}</span>
            <span className="font-semibold">${v.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
