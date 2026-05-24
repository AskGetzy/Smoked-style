'use client'

import { useEffect, useState } from 'react'
import type { Order } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { useLanguage } from '@/lib/language-context'
import { orderStatusLabel } from '@/lib/i18n'
import { getRevertStatus, getSettableStatuses } from '@/lib/order-status'

type Props = {
  order: Order
  onUpdated: () => void
  /** Boss uses bearer auth via fetchWithAuth; admin uses cookie session fetch. */
  useBossAuth?: boolean
  className?: string
}

export default function OrderStatusActions({
  order,
  onUpdated,
  useBossAuth = false,
  className = '',
}: Props) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const settable = getSettableStatuses(order.status, order.order_type)
  const revertTarget = getRevertStatus(order.status, order.order_type)
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  useEffect(() => {
    const options = getSettableStatuses(order.status, order.order_type)
    setSelectedStatus(options[0] ?? '')
    setError('')
  }, [order.status, order.order_type])

  async function postStatus(body: { status?: string; revert?: boolean }) {
    setBusy(true)
    setError('')
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, ...body }),
    }
    const res = useBossAuth
      ? await fetchWithAuth('/api/admin/orders/status', init)
      : await fetch('/api/admin/orders/status', { ...init, credentials: 'include' })

    if (res.ok) {
      onUpdated()
    } else {
      const payload = await res.json().catch(() => ({}))
      setError(payload.error ?? t.couldNotUpdateStatus)
    }
    setBusy(false)
  }

  const adminStatusClass: Record<string, string> = {
    approved: 'bg-slate-600 hover:bg-slate-700',
    ready_for_pickup: 'bg-orange-500 hover:bg-orange-600',
    out_for_delivery: 'bg-purple-600 hover:bg-purple-700',
    delivered: 'bg-green-600 hover:bg-green-700',
  }

  if (settable.length === 0 && !revertTarget) {
    return (
      <p className={`text-sm text-gray-500 ${className}`}>
        Status cannot be changed from {orderStatusLabel(t, order.status)}.
      </p>
    )
  }

  if (useBossAuth) {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Current:{' '}
          <span className="font-black text-gray-900 capitalize">
            {orderStatusLabel(t, order.status)}
          </span>
        </div>

        {settable.length > 0 && (
          <>
            <label className="text-sm font-bold text-gray-700" htmlFor="boss-order-status">
              Change status to
            </label>
            <select
              id="boss-order-status"
              value={selectedStatus}
              disabled={busy}
              onChange={e => setSelectedStatus(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base font-semibold focus:border-orange-400 focus:outline-none"
            >
              {settable.map(status => (
                <option key={status} value={status}>
                  {orderStatusLabel(t, status)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !selectedStatus || selectedStatus === order.status}
              onClick={() => postStatus({ status: selectedStatus })}
              className="min-h-14 w-full rounded-2xl text-lg font-black text-white disabled:opacity-60"
              style={{ background: 'var(--navy)' }}
            >
              {busy ? 'Updating…' : 'Update status'}
            </button>
          </>
        )}

        {revertTarget && (
          <button
            type="button"
            disabled={busy}
            onClick={() => postStatus({ revert: true })}
            className="min-h-12 w-full rounded-2xl border-2 border-gray-300 bg-white text-base font-black text-gray-800 disabled:opacity-60"
          >
            Revert to {orderStatusLabel(t, revertTarget)}
          </button>
        )}

        {error && <p className="text-base font-bold text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {settable.map(status => (
        <button
          key={status}
          type="button"
          disabled={busy}
          onClick={() => postStatus({ status })}
          className={`w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${adminStatusClass[status] ?? 'bg-gray-600'}`}
        >
          {status === 'out_for_delivery'
            ? `🚗 ${orderStatusLabel(t, status)}`
            : status === 'delivered'
              ? `✓ ${orderStatusLabel(t, status)}`
              : orderStatusLabel(t, status)}
        </button>
      ))}
      {revertTarget && (
        <button
          type="button"
          disabled={busy}
          onClick={() => postStatus({ revert: true })}
          className="w-full py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          ← {t.revertStatus}: {orderStatusLabel(t, revertTarget)}
        </button>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}
