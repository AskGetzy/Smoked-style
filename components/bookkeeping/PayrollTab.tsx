'use client'

import { useEffect, useState } from 'react'
import type { BookkeepingDateRange } from '@/lib/bookkeeping'
import DateRangePicker from '@/components/bookkeeping/DateRangePicker'

type Staff = {
  id: string
  full_name: string
  role: string | null
  pay_type: string
  rate: number
}

type PayrollEntry = {
  id: string
  period_start: string
  period_end: string
  hours_worked: number | null
  amount_paid: number
  notes: string | null
  staff_members: Staff | null
}

type Props = {
  range: BookkeepingDateRange
  onRangeChange: (preset: BookkeepingDateRange['preset'], start?: string, end?: string) => void
}

function qs(range: BookkeepingDateRange) {
  return `preset=${range.preset}&start=${range.start}&end=${range.end}`
}

export default function PayrollTab({ range, onRangeChange }: Props) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [total, setTotal] = useState(0)
  const [byMonth, setByMonth] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [showEntryForm, setShowEntryForm] = useState(false)

  const [staffForm, setStaffForm] = useState({ full_name: '', role: '', pay_type: 'hourly', rate: '' })
  const [entryForm, setEntryForm] = useState({
    staff_member_id: '',
    period_start: '',
    period_end: '',
    hours_worked: '',
    amount_paid: '',
    notes: '',
  })

  useEffect(() => {
    void load()
  }, [range])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/bookkeeping/payroll?${qs(range)}`, { credentials: 'include' })
    const json = await res.json()
    if (res.ok) {
      setStaff(json.staff ?? [])
      setEntries(json.entries ?? [])
      setTotal(json.total ?? 0)
      setByMonth(json.byMonth ?? {})
    }
    setLoading(false)
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/bookkeeping/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: 'staff', ...staffForm, rate: Number(staffForm.rate) }),
    })
    setShowStaffForm(false)
    setStaffForm({ full_name: '', role: '', pay_type: 'hourly', rate: '' })
    void load()
  }

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/bookkeeping/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type: 'entry',
        ...entryForm,
        hours_worked: entryForm.hours_worked ? Number(entryForm.hours_worked) : null,
        amount_paid: Number(entryForm.amount_paid),
      }),
    })
    setShowEntryForm(false)
    void load()
  }

  return (
    <div className="space-y-6">
      <DateRangePicker range={range} onChange={onRangeChange} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowStaffForm(!showStaffForm)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
          Add staff member
        </button>
        <button type="button" onClick={() => setShowEntryForm(!showEntryForm)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--navy)' }}>
          Add payroll entry
        </button>
      </div>

      {showStaffForm && (
        <form onSubmit={saveStaff} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
          <input required placeholder="Full name" value={staffForm.full_name} onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input placeholder="Role" value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <select value={staffForm.pay_type} onChange={e => setStaffForm(f => ({ ...f, pay_type: e.target.value }))} className="rounded-lg border px-3 py-2">
            <option value="hourly">Hourly</option>
            <option value="salary">Salary</option>
          </select>
          <input required type="number" min="0" step="0.01" placeholder="Rate" value={staffForm.rate} onChange={e => setStaffForm(f => ({ ...f, rate: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white sm:col-span-2" style={{ background: 'var(--navy)' }}>Save staff</button>
        </form>
      )}

      {showEntryForm && (
        <form onSubmit={saveEntry} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
          <select required value={entryForm.staff_member_id} onChange={e => setEntryForm(f => ({ ...f, staff_member_id: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2">
            <option value="">Select staff</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
          <input required type="date" value={entryForm.period_start} onChange={e => setEntryForm(f => ({ ...f, period_start: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input required type="date" value={entryForm.period_end} onChange={e => setEntryForm(f => ({ ...f, period_end: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input type="number" min="0" step="0.1" placeholder="Hours" value={entryForm.hours_worked} onChange={e => setEntryForm(f => ({ ...f, hours_worked: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input required type="number" min="0" step="0.01" placeholder="Amount paid" value={entryForm.amount_paid} onChange={e => setEntryForm(f => ({ ...f, amount_paid: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <input placeholder="Notes" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} className="rounded-lg border px-3 py-2 sm:col-span-2" />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white sm:col-span-2" style={{ background: 'var(--navy)' }}>Save entry</button>
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
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-medium">{entry.staff_members?.full_name ?? '—'}</td>
                    <td className="px-4 py-3">{entry.period_start} — {entry.period_end}</td>
                    <td className="px-4 py-3">{entry.hours_worked ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-bold">${Number(entry.amount_paid).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                  <td className="px-4 py-3 text-right">${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h4 className="mb-2 font-semibold">Monthly payroll totals</h4>
            <ul className="space-y-1 text-sm">
              {Object.entries(byMonth).map(([month, amount]) => (
                <li key={month} className="flex justify-between">
                  <span>{month}</span>
                  <span className="font-semibold">${amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
