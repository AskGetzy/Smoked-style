'use client'

import { Fragment, useRef, useState } from 'react'
import BossCardPayment, { type BossCardPaymentHandle } from '@/components/BossCardPayment'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { buildBulkUploadTemplateCsv } from '@/lib/bulk-order-parse'
import type { BulkRowError, ParsedBulkRow } from '@/lib/bulk-order-parse'

type Props = {
  variant?: 'admin' | 'boss'
}

type RowResult = {
  index: number
  success: boolean
  orderNumber?: string
  error?: string
}

export default function BulkOrderUpload({ variant = 'admin' }: Props) {
  const isBoss = variant === 'boss'
  const fileRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<BossCardPaymentHandle>(null)

  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedBulkRow[]>([])
  const [rowErrors, setRowErrors] = useState<BulkRowError[]>([])
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [rowPayments, setRowPayments] = useState<Record<number, string>>({})
  const [chargingRow, setChargingRow] = useState<number | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [cardError, setCardError] = useState('')
  const [confirmingCard, setConfirmingCard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<RowResult[] | null>(null)

  function downloadTemplate() {
    const csv = buildBulkUploadTemplateCsv()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-order-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(file: File) {
    setParsing(true)
    setParseError(null)
    setResults(null)
    setRowPayments({})
    setExcluded(new Set())

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetchWithAuth('/api/admin/orders/bulk-parse', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setParseError(data.error ?? 'Could not parse file')
        setRows([])
        setRowErrors([])
        return
      }
      setRows(data.rows ?? [])
      setRowErrors(data.errors ?? [])
    } catch {
      setParseError('Could not upload file')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function toggleExclude(rowNumber: number) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

  function startCharging(row: ParsedBulkRow) {
    setChargingRow(row.rowNumber)
    setCardComplete(false)
    setCardError('')
  }

  async function confirmCharge(row: ParsedBulkRow) {
    setConfirmingCard(true)
    setCardError('')
    try {
      const result = await cardRef.current?.confirmPayment()
      if (!result?.ok) {
        setCardError(result?.error ?? 'Could not authorize card')
        return
      }
      setRowPayments(prev => ({ ...prev, [row.rowNumber]: result.paymentIntentId }))
      setChargingRow(null)
    } finally {
      setConfirmingCard(false)
    }
  }

  function removeCharge(rowNumber: number) {
    setRowPayments(prev => {
      const next = { ...prev }
      delete next[rowNumber]
      return next
    })
  }

  async function submitOrders() {
    const included = rows.filter(r => !excluded.has(r.rowNumber))
    if (included.length === 0) return

    setSubmitting(true)
    setResults(null)
    try {
      const res = await fetchWithAuth('/api/admin/orders/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: included.map(r => ({
            full_name: r.full_name,
            phone: r.phone,
            email: r.email,
            product_id: r.product_id,
            quantity: r.quantity,
            selected_flavor: r.selected_flavor,
            selected_weight: r.selected_weight,
            selected_size: r.selected_size,
            order_type: r.order_type,
            delivery_area_id: r.delivery_area_id,
            address: r.address,
            delivery_date: r.delivery_date,
            notes: r.notes,
            gift_message: r.gift_message,
            paymentIntentId: rowPayments[r.rowNumber] ?? null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setParseError(data.error ?? 'Could not create orders')
        return
      }
      setResults(data.results ?? [])
    } catch {
      setParseError('Could not create orders')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setRows([])
    setRowErrors([])
    setExcluded(new Set())
    setRowPayments({})
    setResults(null)
    setParseError(null)
  }

  const included = rows.filter(r => !excluded.has(r.rowNumber))
  const wrapClass = isBoss ? 'space-y-4' : 'space-y-4 bg-white rounded-xl border border-gray-100 p-4'

  if (results) {
    const created = results.filter(r => r.success).length
    const failed = results.length - created
    return (
      <div className={wrapClass}>
        <h2 className={isBoss ? 'text-lg font-black' : 'text-lg font-bold text-gray-900'}>Bulk Upload Results</h2>
        <p className="text-sm text-gray-700">
          Created <span className="font-bold text-green-700">{created}</span> order(s)
          {failed > 0 && <> &mdash; <span className="font-bold text-red-600">{failed}</span> failed</>}
        </p>
        {failed > 0 && (
          <ul className="space-y-1 text-sm text-red-700">
            {results.filter(r => !r.success).map(r => (
              <li key={r.index}>Row {included[r.index]?.rowNumber ?? r.index}: {r.error}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Upload another file
        </button>
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          className={isBoss
            ? 'min-h-12 rounded-2xl border-2 border-gray-200 bg-white px-4 text-base font-black text-gray-800 disabled:opacity-60'
            : 'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60'}
        >
          {parsing ? 'Parsing…' : '📤 Upload spreadsheet'}
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          Download template (.csv)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>

      {parseError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {parseError}
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p className="mb-1 font-bold">{rowErrors.length} row(s) could not be parsed and will be skipped:</p>
          <ul className="list-inside list-disc space-y-0.5">
            {rowErrors.map(err => (
              <li key={err.rowNumber}>Row {err.rowNumber}: {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">Total</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Payment</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => {
                  const isExcluded = excluded.has(row.rowNumber)
                  const total = row.line_total + row.delivery_fee
                  const paid = rowPayments[row.rowNumber]
                  return (
                    <Fragment key={row.rowNumber}>
                      <tr className={isExcluded ? 'opacity-40' : ''}>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-gray-900">{row.full_name}</div>
                          <div className="text-xs text-gray-500">{row.phone}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.product_name} &times;{row.quantity}
                          {row.selected_flavor ? ` (${row.selected_flavor})` : ''}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">${total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-600">{row.delivery_date}</td>
                        <td className="px-3 py-2">
                          {paid ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                              ✓ Paid
                              <button type="button" onClick={() => removeCharge(row.rowNumber)} className="text-green-800 underline">undo</button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isExcluded}
                              onClick={() => startCharging(row)}
                              className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 disabled:opacity-50"
                            >
                              Charge card
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExclude(row.rowNumber)}
                            className="text-xs font-semibold text-gray-500 hover:text-red-600"
                          >
                            {isExcluded ? 'Include' : 'Skip'}
                          </button>
                        </td>
                      </tr>
                      {chargingRow === row.rowNumber && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-3 py-3">
                            <div className="space-y-2">
                              <BossCardPayment
                                ref={cardRef}
                                active
                                subtotal={row.line_total}
                                deliveryFee={row.delivery_fee}
                                email={row.email ?? ''}
                                onCompleteChange={setCardComplete}
                              />
                              {cardError && <p className="text-sm font-semibold text-red-600">{cardError}</p>}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={!cardComplete || confirmingCard}
                                  onClick={() => void confirmCharge(row)}
                                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  {confirmingCard ? 'Charging…' : 'Confirm charge'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setChargingRow(null)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void submitOrders()}
              disabled={submitting || included.length === 0}
              className={isBoss
                ? 'min-h-12 rounded-2xl px-5 text-base font-black text-white disabled:opacity-60'
                : 'rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60'}
              style={{ background: 'var(--rustic-ember, #C8521A)' }}
            >
              {submitting ? 'Creating…' : `Create ${included.length} Order${included.length === 1 ? '' : 's'}`}
            </button>
            <span className="text-xs text-gray-500">Orders without a card charge are created as invoice / pay later.</span>
          </div>
        </>
      )}
    </div>
  )
}
