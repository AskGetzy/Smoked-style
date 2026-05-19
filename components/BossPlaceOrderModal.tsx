'use client'

import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'
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
  subtotal: number
  deliveryFee: number
  total: number
  lineCount: number
  onSuccess: (orderNumber: string) => void
}

type PaymentInit = {
  clientSecret: string
  paymentIntentId: string
}

function ConfirmPlaceOrder({
  payload,
  total,
  chargeCard,
  paymentInit,
  onClose,
  onSuccess,
}: {
  payload: BossPlaceOrderPayload
  total: number
  chargeCard: boolean
  paymentInit: PaymentInit | null
  onClose: () => void
  onSuccess: (orderNumber: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canConfirm =
    !busy &&
    (!chargeCard || (paymentInit && paymentComplete && stripe && elements))

  async function confirm() {
    setBusy(true)
    setError('')

    try {
      let paymentIntentId: string | undefined

      if (chargeCard) {
        if (!stripe || !elements || !paymentInit) {
          setError('Card form is still loading.')
          setBusy(false)
          return
        }

        const { error: payError } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: window.location.origin + '/boss/new-order' },
          redirect: 'if_required',
        })

        if (payError) {
          setError(payError.message ?? 'Payment failed')
          setBusy(false)
          return
        }
        paymentIntentId = paymentInit.paymentIntentId
      }

      const res = await fetchWithAuth('/api/boss/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, paymentIntentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not create order')
      onSuccess(data.orderNumber)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create order')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-gray-600">
        {chargeCard
          ? 'Card will be authorized now. You can capture payment when you approve the order.'
          : 'No card charge. You can collect payment later or approve without a card on file.'}
      </p>

      {chargeCard && paymentInit && (
        <div className="rounded-2xl border border-gray-200 bg-white p-3">
          <PaymentElement
            options={{ layout: 'tabs' }}
            onChange={event => setPaymentComplete(event.complete)}
          />
        </div>
      )}

      <div className="rounded-2xl bg-gray-50 p-4 text-base">
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span style={{ color: 'var(--orange)' }}>${total.toFixed(2)}</span>
        </div>
        <div className="mt-1 text-sm text-gray-500">{payload.customer.full_name} · {payload.customer.phone}</div>
      </div>

      {error && <p className="text-center text-base font-bold text-red-600">{error}</p>}

      <button
        type="button"
        onClick={confirm}
        disabled={!canConfirm}
        className="min-h-14 w-full rounded-2xl text-lg font-black text-white disabled:opacity-50"
        style={{ background: 'var(--orange)' }}
      >
        {busy ? 'Placing order...' : chargeCard ? `Authorize & place — $${total.toFixed(2)}` : 'Confirm place order'}
      </button>

      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="min-h-12 w-full rounded-2xl border-2 border-gray-200 bg-white text-base font-black text-gray-700 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  )
}

export default function BossPlaceOrderModal({
  open,
  onClose,
  payload,
  subtotal,
  deliveryFee,
  total,
  lineCount,
  onSuccess,
}: Props) {
  const [chargeCard, setChargeCard] = useState(false)
  const [paymentInit, setPaymentInit] = useState<PaymentInit | null>(null)
  const [preparingPayment, setPreparingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    if (!open) {
      setChargeCard(false)
      setPaymentInit(null)
      setPaymentError('')
      setPreparingPayment(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !chargeCard) {
      setPaymentInit(null)
      setPaymentError('')
      return
    }

    let cancelled = false
    async function initPayment() {
      setPreparingPayment(true)
      setPaymentError('')
      setPaymentInit(null)
      try {
        const res = await fetchWithAuth('/api/boss/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtotal,
            deliveryFee,
            email: payload.customer.email,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not load card form')
        if (cancelled) return
        if (!data.clientSecret || !data.paymentIntentId) {
          throw new Error('Payment setup failed')
        }
        setPaymentInit({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
        })
      } catch (e: unknown) {
        if (!cancelled) {
          setPaymentError(e instanceof Error ? e.message : 'Could not load card form')
        }
      } finally {
        if (!cancelled) setPreparingPayment(false)
      }
    }

    void initPayment()
    return () => { cancelled = true }
  }, [open, chargeCard, subtotal, deliveryFee, payload.customer.email])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl">
        <h2 className="mb-4 text-xl font-black" style={{ color: 'var(--navy)' }}>Place order</h2>
        <p className="mb-4 text-sm text-gray-500">
          {lineCount} item{lineCount === 1 ? '' : 's'} · ${subtotal.toFixed(2)} subtotal
          {deliveryFee > 0 ? ` · $${deliveryFee.toFixed(2)} delivery` : ''}
        </p>

        <label className="mb-4 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-gray-200 bg-gray-50 px-4">
          <input
            type="checkbox"
            checked={chargeCard}
            onChange={e => setChargeCard(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300"
          />
          <span className="text-base font-black text-gray-800">Charge credit card now</span>
        </label>

        {chargeCard && preparingPayment && (
          <div className="mb-4 flex min-h-24 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
          </div>
        )}

        {chargeCard && paymentError && (
          <p className="mb-4 text-center text-base font-bold text-red-600">{paymentError}</p>
        )}

        {chargeCard && paymentInit ? (
          <Elements
            stripe={getStripe()}
            options={{
              clientSecret: paymentInit.clientSecret,
              appearance: { theme: 'stripe' },
            }}
          >
            <ConfirmPlaceOrder
              payload={payload}
              total={total}
              chargeCard
              paymentInit={paymentInit}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          </Elements>
        ) : !chargeCard ? (
          <ConfirmPlaceOrder
            payload={payload}
            total={total}
            chargeCard={false}
            paymentInit={null}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : (
          !preparingPayment && !paymentError && (
            <p className="text-center text-base text-gray-500">Preparing card form…</p>
          )
        )}
      </div>
    </div>
  )
}
