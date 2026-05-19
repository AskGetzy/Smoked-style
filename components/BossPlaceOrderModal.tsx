'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/auth-fetch'

export type BossPlaceOrderPayload = {
  customerId: string
  customer: { full_name: string; phone: string; email: string }
  items: unknown[]
  orderType: 'delivery' | 'pickup'
  deliveryAreaId: string
  deliveryAddress: string
  deliveryFee: number
  deliveryDate: string
  notes: string
}

type Props = {
  open: boolean
  onClose: () => void
  payload: BossPlaceOrderPayload
  total: number
  lineCount: number
  onSuccess: (orderNumber: string) => void
}

export default function BossPlaceOrderModal({
  open,
  onClose,
  payload,
  total,
  lineCount,
  onSuccess,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setBusy(false)
      setError('')
    }
  }, [open])

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      const res = await fetchWithAuth('/api/boss/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not create order')
      onSuccess(data.orderNumber)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create order')
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl">
        <h2 className="mb-4 text-xl font-black" style={{ color: 'var(--navy)' }}>Confirm order</h2>
        <p className="mb-4 text-sm text-gray-500">
          {lineCount} item{lineCount === 1 ? '' : 's'} · no card on file
        </p>

        <div className="mb-4 rounded-2xl bg-gray-50 p-4 text-base">
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span style={{ color: 'var(--orange)' }}>${total.toFixed(2)}</span>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {payload.customer.full_name} · {payload.customer.phone}
          </div>
        </div>

        <p className="mb-4 text-base text-gray-600">
          Payment can be collected later when you approve this order.
        </p>

        {error && <p className="mb-4 text-center text-base font-bold text-red-600">{error}</p>}

        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="min-h-14 w-full rounded-2xl text-lg font-black text-white disabled:opacity-50"
          style={{ background: 'var(--orange)' }}
        >
          {busy ? 'Placing order...' : `Place order — $${total.toFixed(2)}`}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-3 min-h-12 w-full rounded-2xl border-2 border-gray-200 bg-white text-base font-black text-gray-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
