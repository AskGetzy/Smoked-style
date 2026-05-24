'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BookkeepingDateRange } from '@/lib/bookkeeping'
import DateRangePicker from '@/components/bookkeeping/DateRangePicker'
import {
  EXTRA_PAY_PRESETS,
  computeHourlyBasePay,
  computeEntryBasePay,
  emptyExtraLine,
  extrasTotal,
  parsePayrollExtras,
  type ExtraPayLine,
} from '@/lib/payroll-extras'

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
  extras: unknown
  staff_members: Staff | null
}

type Props = {
  range: BookkeepingDateRange
  onRangeChange: (preset: BookkeepingDateRange['preset'], start?: string, end?: string) => void
}

function qs(range: BookkeepingDateRange) {
  return `preset=${range.preset}&start=${range.start}&end=${range.end}`
}

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`
}

export default function PayrollTab({ range, onRangeChange }: Props) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [total, setTotal] = useState(0)
  const [byMonth, setByMonth] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null)
  const [saving, setSaving] = useState(false)

  const [staffForm, setStaffForm] = useState({ full_name: '', role: '', pay_type: 'hourly', rate: '' })
  const [entryForm, setEntryForm] = useState({
    staff_member_id: '',
    period_start: '',
    period_end: '',
    hours_worked: '',
    salary_amount: '',
    notes: '',
  })
  const [extraLines, setExtraLines] = useState<ExtraPayLine[]>([])

  const selectedStaff = useMemo(
    () => staff.find(s => s.id === entryForm.staff_member_id) ?? null,
    [staff, entryForm.staff_member_id],
  )

  const isHourly = selectedStaff?.pay_type === 'hourly'

  useEffect(() => {
    if (!selectedStaff || selectedStaff.pay_type !== 'salary') return
    setEntryForm(f => ({
      ...f,
      salary_amount: f.salary_amount || String(selectedStaff.rate),
    }))
  }, [selectedStaff?.id, selectedStaff?.pay_type, selectedStaff?.rate])

  const hours = Number(entryForm.hours_worked) || 0
  const hourlyRate = Number(selectedStaff?.rate) || 0
  const basePay = isHourly ? computeHourlyBasePay(hours, hourlyRate) : Number(entryForm.salary_amount) || 0
  const extrasSum = extrasTotal(extraLines.filter(l => l.amount > 0))
  const totalToPay = basePay + extrasSum

  useEffect(() => {
    void load()
  }, [range])

  function resetEntryForm() {
    setEntryForm({
      staff_member_id: '',
      period_start: '',
      period_end: '',
      hours_worked: '',
      salary_amount: '',
      notes: '',
    })
    setExtraLines([])
  }

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

  function updateExtraLine(index: number, patch: Partial<ExtraPayLine>) {
    setExtraLines(lines => lines.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  function addExtraLine() {
    setExtraLines(lines => [...lines, emptyExtraLine()])
  }

  function removeExtraLine(index: number) {
    setExtraLines(lines => lines.filter((_, i) => i !== index))
  }

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStaff) return

    const extras = extraLines
      .filter(line => line.amount > 0 && line.description.trim())
      .map(line => ({
        description: line.description.trim(),
        amount: Number(line.amount),
      }))

    const payload = {
      type: 'entry',
      staff_member_id: entryForm.staff_member_id,
      period_start: entryForm.period_start,
      period_end: entryForm.period_end,
      hours_worked: isHourly && entryForm.hours_worked ? Number(entryForm.hours_worked) : null,
      amount_paid: totalToPay,
      notes: entryForm.notes.trim() || null,
      extras,
    }

    setSaving(true)
    const res = await fetch('/api/bookkeeping/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    setSaving(false)

    if (res.ok) {
      setShowEntryForm(false)
      resetEntryForm()
      void load()
    }
  }

  function entryBreakdown(entry: PayrollEntry) {
    const member = entry.staff_members
    const extras = parsePayrollExtras(entry.extras)
    const extrasSum = extrasTotal(extras)
    const base = member
      ? computeEntryBasePay(member.pay_type, entry.hours_worked, Number(member.rate), Number(entry.amount_paid), extras)
      : Number(entry.amount_paid) - extrasSum

    return { member, extras, extrasSum, base, total: Number(entry.amount_paid) }
  }

  return (
    <div className="space-y-6">
      <DateRangePicker range={range} onChange={onRangeChange} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowStaffForm(!showStaffForm)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
          Add staff member
        </button>
        <button
          type="button"
          onClick={() => {
            resetEntryForm()
            setShowEntryForm(!showEntryForm)
          }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--navy)' }}
        >
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
          <input required type="number" min="0" step="0.01" placeholder={staffForm.pay_type === 'hourly' ? 'Hourly rate' : 'Salary amount'} value={staffForm.rate} onChange={e => setStaffForm(f => ({ ...f, rate: e.target.value }))} className="rounded-lg border px-3 py-2" />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white sm:col-span-2" style={{ background: 'var(--navy)' }}>Save staff</button>
        </form>
      )}

      {showEntryForm && (
        <form onSubmit={saveEntry} className="space-y-4 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Staff member</span>
              <select
                required
                value={entryForm.staff_member_id}
                onChange={e => setEntryForm(f => ({ ...f, staff_member_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select staff</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.pay_type === 'hourly' ? `${formatMoney(s.rate)}/hr` : `${formatMoney(s.rate)} salary`})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Pay period start</span>
              <input required type="date" value={entryForm.period_start} onChange={e => setEntryForm(f => ({ ...f, period_start: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Pay period end</span>
              <input required type="date" value={entryForm.period_end} onChange={e => setEntryForm(f => ({ ...f, period_end: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>

            {isHourly ? (
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium">Hours worked</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.1"
                  value={entryForm.hours_worked}
                  onChange={e => setEntryForm(f => ({ ...f, hours_worked: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
                {selectedStaff && hours > 0 && (
                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    {hours} hours × {formatMoney(hourlyRate)}/hr = {formatMoney(basePay)}
                  </p>
                )}
              </label>
            ) : (
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium">Salary amount (base pay)</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.salary_amount}
                  onChange={e => setEntryForm(f => ({ ...f, salary_amount: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </label>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Additional pay</h4>
              <button type="button" onClick={addExtraLine} className="text-sm font-semibold text-orange-600">
                + Add another
              </button>
            </div>
            {extraLines.length === 0 ? (
              <p className="text-sm text-gray-500">No extra pay items. Click &quot;Add another&quot; for overtime, taxi, bonus, etc.</p>
            ) : (
              <div className="space-y-3">
                {extraLines.map((line, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[140px] flex-1">
                      <label className="text-xs text-gray-500">Description</label>
                      <select
                        value={EXTRA_PAY_PRESETS.includes(line.description as (typeof EXTRA_PAY_PRESETS)[number]) ? line.description : 'Other'}
                        onChange={e => {
                          const v = e.target.value
                          updateExtraLine(index, { description: v === 'Other' ? '' : v })
                        }}
                        className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                      >
                        {EXTRA_PAY_PRESETS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      {(!EXTRA_PAY_PRESETS.includes(line.description as (typeof EXTRA_PAY_PRESETS)[number]) || line.description === 'Other') && (
                        <input
                          placeholder="Custom description"
                          value={EXTRA_PAY_PRESETS.includes(line.description as (typeof EXTRA_PAY_PRESETS)[number]) && line.description !== 'Other' ? '' : line.description}
                          onChange={e => updateExtraLine(index, { description: e.target.value })}
                          className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                        />
                      )}
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-gray-500">Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.amount || ''}
                        onChange={e => updateExtraLine(index, { amount: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                      />
                    </div>
                    <button type="button" onClick={() => removeExtraLine(index)} className="rounded-lg px-2 py-2 text-sm font-semibold text-red-600">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="flex justify-between py-1">
              <span>Base pay</span>
              <span className="font-semibold">{formatMoney(basePay)}</span>
            </div>
            {extraLines.filter(l => l.amount > 0 && l.description).map((line, i) => (
              <div key={i} className="flex justify-between py-1 text-gray-600">
                <span>{line.description}</span>
                <span>{formatMoney(line.amount)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-black">
              <span>Total to pay</span>
              <span style={{ color: 'var(--navy)' }}>{formatMoney(totalToPay)}</span>
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium">Notes (optional)</span>
            <input value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>

          <button type="submit" disabled={saving || totalToPay <= 0} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--navy)' }}>
            {saving ? 'Saving…' : 'Save payroll entry'}
          </button>
        </form>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-bold">{selectedEntry.staff_members?.full_name ?? 'Payroll'}</h3>
              <button type="button" onClick={() => setSelectedEntry(null)} className="text-gray-500">✕</button>
            </div>
            {(() => {
              const b = entryBreakdown(selectedEntry)
              return (
                <div className="space-y-2 text-sm">
                  <p className="text-gray-500">{selectedEntry.period_start} — {selectedEntry.period_end}</p>
                  {selectedEntry.hours_worked != null && (
                    <p>Hours: {selectedEntry.hours_worked}</p>
                  )}
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <div className="flex justify-between py-1">
                      <span>Base pay</span>
                      <span className="font-semibold">{formatMoney(b.base)}</span>
                    </div>
                    {b.extras.map((line, i) => (
                      <div key={i} className="flex justify-between py-1 text-gray-600">
                        <span>{line.description}</span>
                        <span>{formatMoney(line.amount)}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                      <span>Total paid</span>
                      <span>{formatMoney(b.total)}</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
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
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">Extras</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map(entry => {
                  const b = entryBreakdown(entry)
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="cursor-pointer hover:bg-orange-50"
                    >
                      <td className="px-4 py-3 font-medium">{entry.staff_members?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">{entry.period_start} — {entry.period_end}</td>
                      <td className="px-4 py-3">{entry.hours_worked ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(b.base)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(b.extrasSum)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatMoney(b.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-right">Total</td>
                  <td className="px-4 py-3 text-right">{formatMoney(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-500">Click a row to see the full pay breakdown.</p>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h4 className="mb-2 font-semibold">Monthly payroll totals</h4>
            <ul className="space-y-1 text-sm">
              {Object.entries(byMonth).map(([month, amount]) => (
                <li key={month} className="flex justify-between">
                  <span>{month}</span>
                  <span className="font-semibold">{formatMoney(amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
