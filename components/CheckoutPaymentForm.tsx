'use client'

import { FormEvent, useState } from 'react'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

type Props = {
  orderNumber: string
  total: number
  subtotal: number
  deliveryFee: number
  disabled?: boolean
  onSuccess: () => void
  onError: (message: string) => void
}

export default function CheckoutPaymentForm({
  orderNumber,
  total,
  subtotal,
  deliveryFee,
  disabled,
  onSuccess,
  onError,
}: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) {
      onError('Payment is still loading. Please wait a moment.')
      return
    }

    setLoading(true)
    onError('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/confirmation?order=${encodeURIComponent(orderNumber)}`,
      },
    })

    if (error) {
      onError(error.message ?? 'Payment failed')
      setLoading(false)
      return
    }

    const authorized =
      paymentIntent?.status === 'requires_capture' ||
      paymentIntent?.status === 'succeeded'

    if (!authorized) {
      onError('Your card was not authorized. Please try again or use a different card.')
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-xl border border-gray-200 p-3 bg-white">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <div className="border border-gray-100 rounded-xl p-4 mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Delivery</span>
          <span>${deliveryFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
          <span>Total</span>
          <span style={{ color: 'var(--orange)' }}>${total.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || loading || !stripe || !elements}
        className="w-full mt-6 text-white font-bold py-3 rounded-xl disabled:opacity-60"
        style={{ background: 'var(--navy)' }}
      >
        {loading ? 'Authorizing card...' : `Place Order — $${total.toFixed(2)}`}
      </button>
    </form>
  )
}
