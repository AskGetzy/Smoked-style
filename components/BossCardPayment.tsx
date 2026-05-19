'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { getStripe } from '@/lib/stripe-client'

export type BossCardPaymentHandle = {
  confirmPayment: () => Promise<
    | { ok: true; paymentIntentId: string }
    | { ok: false; error: string }
  >
}

type PaymentInit = {
  clientSecret: string
  paymentIntentId: string
}

type InnerProps = {
  paymentInit: PaymentInit
  onCompleteChange: (complete: boolean) => void
}

const BossCardPaymentFields = forwardRef<BossCardPaymentHandle, InnerProps>(
  function BossCardPaymentFields({ paymentInit, onCompleteChange }, ref) {
    const stripe = useStripe()
    const elements = useElements()

    useImperativeHandle(ref, () => ({
      async confirmPayment() {
        if (!stripe || !elements) {
          return { ok: false, error: 'Card form is still loading. Please wait a moment.' }
        }

        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: `${window.location.origin}/boss/new-order` },
          redirect: 'if_required',
        })

        if (error) {
          return { ok: false, error: error.message ?? 'Payment failed' }
        }

        return { ok: true, paymentIntentId: paymentInit.paymentIntentId }
      },
    }))

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-3">
        <PaymentElement
          options={{ layout: 'tabs' }}
          onChange={event => onCompleteChange(event.complete)}
        />
      </div>
    )
  },
)

type Props = {
  active: boolean
  subtotal: number
  deliveryFee: number
  email: string
  onCompleteChange?: (complete: boolean) => void
}

const BossCardPayment = forwardRef<BossCardPaymentHandle, Props>(function BossCardPayment(
  { active, subtotal, deliveryFee, email, onCompleteChange },
  ref,
) {
  const [paymentInit, setPaymentInit] = useState<PaymentInit | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) {
      setPaymentInit(null)
      setError('')
      setPreparing(false)
      onCompleteChange?.(false)
      return
    }

    let cancelled = false
    async function init() {
      setPreparing(true)
      setError('')
      setPaymentInit(null)
      onCompleteChange?.(false)

      try {
        const res = await fetchWithAuth('/api/boss/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subtotal, deliveryFee, email }),
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
          setError(e instanceof Error ? e.message : 'Could not load card form')
        }
      } finally {
        if (!cancelled) setPreparing(false)
      }
    }

    void init()
    return () => { cancelled = true }
  }, [active, subtotal, deliveryFee, email, onCompleteChange])

  if (!active) return null

  if (preparing) {
    return (
      <div className="flex min-h-24 items-center justify-center py-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
        <span className="sr-only">Loading card form</span>
      </div>
    )
  }

  if (error) {
    return <p className="text-center text-base font-bold text-red-600">{error}</p>
  }

  if (!paymentInit) {
    return <p className="text-center text-sm text-gray-500">Preparing card form…</p>
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret: paymentInit.clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <BossCardPaymentFields
        ref={ref}
        paymentInit={paymentInit}
        onCompleteChange={complete => onCompleteChange?.(complete)}
      />
    </Elements>
  )
})

export default BossCardPayment
