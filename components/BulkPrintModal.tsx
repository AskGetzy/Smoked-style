'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildBulkLabelsZpl,
  buildBulkPrintSearchParams,
  bulkLabelsFilename,
  bulkPrintSummary,
  downloadTextFile,
  validateBulkPrintFilters,
  type BulkPrintFilters,
  type BulkPrintOrderType,
  type BulkPrintScope,
} from '@/lib/bulk-print'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { openBulkPackingSlips } from '@/lib/packing-slip'
import type { DeliveryArea, Order } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
}

async function fetchDeliveryAreas(): Promise<DeliveryArea[]> {
  const res = await fetchWithAuth('/api/boss/catalog')
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Could not load delivery areas')
  return (json.deliveryAreas ?? []) as DeliveryArea[]
}

async function fetchFilteredOrders(filters: BulkPrintFilters): Promise<Order[]> {
  const params = buildBulkPrintSearchParams(filters)
  const url = `/api/admin/orders?${params.toString()}`
  console.log('[bulk-print] Fetching orders', { url, filters })
  const res = await fetchWithAuth(url)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Could not load orders')
  const orders = (json.orders ?? []) as Order[]
  console.log('[bulk-print] Fetched orders', {
    count: orders.length,
    apiCount: json.count,
    orderNumbers: orders.map(o => o.order_number),
  })
  return orders
}

const SCOPE_OPTIONS: { value: BulkPrintScope; label: string }[] = [
  { value: 'date', label: 'Print by date' },
  { value: 'area', label: 'Print by area' },
  { value: 'both', label: 'Print by date and area' },
]

const ORDER_TYPE_OPTIONS: { value: BulkPrintOrderType; label: string }[] = [
  { value: 'all', label: 'All orders (delivery + pickup)' },
  { value: 'delivery', label: 'Delivery only' },
  { value: 'pickup', label: 'Pickup only' },
]

export default function BulkPrintModal({ open, onClose }: Props) {
  const [scope, setScope] = useState<BulkPrintScope>('date')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryAreaId, setDeliveryAreaId] = useState('')
  const [includePending, setIncludePending] = useState(false)
  const [orderType, setOrderType] = useState<BulkPrintOrderType>('all')
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const filters = useMemo<BulkPrintFilters>(
    () => ({ scope, deliveryDate, deliveryAreaId, includePending, orderType }),
    [scope, deliveryDate, deliveryAreaId, includePending, orderType],
  )

  const showAreaFilter = orderType !== 'pickup' && (scope === 'area' || scope === 'both')

  const selectedAreaName = areas.find(a => a.id === deliveryAreaId)?.name ?? null
  const validationError = validateBulkPrintFilters(filters)

  const loadAreas = useCallback(async () => {
    try {
      const list = await fetchDeliveryAreas()
      setAreas(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load delivery areas')
    }
  }, [])

  const refreshPreview = useCallback(async () => {
    if (validationError) {
      setPreviewCount(null)
      return
    }

    setPreviewLoading(true)
    setError('')

    try {
      const orders = await fetchFilteredOrders(filters)
      setPreviewCount(orders.length)
    } catch (err) {
      setPreviewCount(null)
      setError(err instanceof Error ? err.message : 'Could not preview orders')
    } finally {
      setPreviewLoading(false)
    }
  }, [filters, validationError])

  useEffect(() => {
    if (!open) return
    void loadAreas()
    setError('')
    setPreviewCount(null)
  }, [open, loadAreas])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      void refreshPreview()
    }, 300)
    return () => clearTimeout(timer)
  }, [open, refreshPreview])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function runGenerate(kind: 'labels' | 'slips') {
    const invalid = validateBulkPrintFilters(filters)
    if (invalid) {
      setError(invalid)
      return
    }

    setGenerating(true)
    setError('')

    try {
      const orders = await fetchFilteredOrders(filters)
      if (orders.length === 0) {
        setError('No orders match these filters.')
        return
      }

      if (kind === 'labels') {
        const zpl = buildBulkLabelsZpl(orders)
        console.log('[bulk-print] Downloading ZPL file', {
          orders: orders.length,
          zplLength: zpl.length,
          labelStarts: (zpl.match(/\^XA/g) ?? []).length,
        })
        downloadTextFile(bulkLabelsFilename(filters, selectedAreaName), zpl, 'application/octet-stream')
      } else {
        openBulkPackingSlips(orders)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate print file')
    } finally {
      setGenerating(false)
    }
  }

  if (!open) return null

  const labelSummary =
    previewCount != null && !validationError
      ? bulkPrintSummary(previewCount, filters, selectedAreaName, 'labels')
      : null
  const slipSummary =
    previewCount != null && !validationError
      ? bulkPrintSummary(previewCount, filters, selectedAreaName, 'packing slips')
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-print-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="bulk-print-title" className="text-lg font-black" style={{ color: 'var(--navy)' }}>
            Bulk Print
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-400"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-gray-700">Print scope</legend>
            {SCOPE_OPTIONS.map(option => (
              <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
                <input
                  type="radio"
                  name="bulk-print-scope"
                  value={option.value}
                  checked={scope === option.value}
                  onChange={() => setScope(option.value)}
                  className="h-4 w-4 accent-orange-500"
                />
                <span className="text-sm font-semibold text-gray-800">{option.label}</span>
              </label>
            ))}
          </fieldset>

          {(scope === 'date' || scope === 'both') && (
            <label className="block text-sm font-bold text-gray-700">
              Delivery date
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-3 text-base focus:border-orange-400 focus:outline-none"
              />
            </label>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-gray-700">Order type</legend>
            {ORDER_TYPE_OPTIONS.map(option => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2"
              >
                <input
                  type="radio"
                  name="bulk-order-type"
                  value={option.value}
                  checked={orderType === option.value}
                  onChange={() => setOrderType(option.value)}
                  className="h-4 w-4 accent-orange-500"
                />
                <span className="text-sm font-semibold text-gray-800">{option.label}</span>
              </label>
            ))}
          </fieldset>

          {showAreaFilter && (
            <label className="block text-sm font-bold text-gray-700">
              Delivery area
              <select
                value={deliveryAreaId}
                onChange={e => setDeliveryAreaId(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-3 text-base focus:border-orange-400 focus:outline-none"
              >
                <option value="">Select area</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-gray-700">Status filter</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
              <input
                type="radio"
                name="bulk-status"
                checked={!includePending}
                onChange={() => setIncludePending(false)}
                className="h-4 w-4 accent-orange-500"
              />
              <span className="text-sm font-semibold text-gray-800">
                Approved, ready for pickup, and out for delivery
              </span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
              <input
                type="radio"
                name="bulk-status"
                checked={includePending}
                onChange={() => setIncludePending(true)}
                className="h-4 w-4 accent-orange-500"
              />
              <span className="text-sm font-semibold text-gray-800">Approved + pending</span>
            </label>
          </fieldset>

          {validationError && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{validationError}</p>
          )}

          {previewLoading && (
            <p className="text-center text-sm text-gray-500">Counting matching orders…</p>
          )}

          {!previewLoading && labelSummary && (
            <div className="rounded-xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-950">
              {labelSummary}
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button
            type="button"
            disabled={generating || Boolean(validationError) || previewCount === 0}
            onClick={() => void runGenerate('labels')}
            className="h-12 w-full rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'var(--navy)' }}
          >
            {generating ? 'Generating…' : 'Generate Labels (.zpl)'}
          </button>
          <button
            type="button"
            disabled={generating || Boolean(validationError) || previewCount === 0}
            onClick={() => void runGenerate('slips')}
            className="h-12 w-full rounded-xl border-2 border-orange-500 text-sm font-bold text-orange-600 disabled:opacity-50"
          >
            Bulk Print Packing Slips
          </button>
          {slipSummary && !previewLoading && (
            <p className="text-center text-xs text-gray-500">{slipSummary}</p>
          )}
        </div>
      </div>
    </div>
  )
}
