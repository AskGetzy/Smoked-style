'use client'

import { useEffect, useState } from 'react'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { CartItem } from '@/types'

type Props = {
  step: number
  total: number
  subtotal: number
  deliveryFee: number
  checkoutPayload: {
    cart: Pick<CartItem, 'product_id' | 'product_name' | 'quantity' | 'selected_flavor' | 'selected_weight' | 'selected_size'>[]
    contact: { name: string; email: string; phone: string }
    orderType: 'delivery' | 'pickup'
    areaId?: string
    address?: string
    recipientName: string
    recipientPhone: string
    deliveryDate: string
    notes: string
    giftMessage: string
    userId?: string
  }
  onReviewReady: () => void
  onBackToPayment: () => void
  onSuccess: (orderNumber: string) => void
  onError: (message: string) => void
}

export default function CheckoutPaymentForm({
  step,
  total,
  subtotal,
  deliveryFee,
  checkoutPayload,
  onReviewReady,
  onBackToPayment,
  onSuccess,
  onError,
}: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  useEffect(() => {
    console.log('Stripe instance loaded:', Boolean(stripe), stripe)
  }, [stripe])

  async function placeOrder() {
    if (!stripe || !elements) {
      onError('Payment is still loading. Please wait a moment.')
      return
    }

    setLoading(true)
    onError('')

    const submitResult = await elements.submit()
    if (submitResult.error) {
      onError(submitResult.error.message ?? 'Please check your card details.')
      setLoading(false)
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/confirmation`,
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

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checkoutPayload,
          paymentIntentId: paymentIntent.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not create order')
      onSuccess(data.orderNumber)
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Could not create order')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={step === 3 ? '' : 'hidden'}>
        <div className="rounded-xl border border-gray-200 p-3 bg-white">
          <PaymentElement
            options={{ layout: 'tabs' }}
            onChange={(event) => setPaymentComplete(event.complete)}
          />
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
          type="button"
          disabled={!paymentComplete || !stripe || !elements}
          onClick={onReviewReady}
          className="w-full mt-6 text-white font-bold py-3 rounded-xl disabled:opacity-60"
          style={{ background: 'var(--navy)' }}
        >
          Continue to Review
        </button>
      </div>

      {step === 4 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Review Your Order</h2>
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 mb-4">
            {checkoutPayload.cart.map((item, index) => (
              <div key={`${item.product_id}-${index}`} className="p-3 text-sm">
                <div className="font-medium text-gray-900">{item.product_name}</div>
                <div className="text-gray-500">
                  Quantity: {item.quantity}
                  {item.selected_flavor ? ` · ${item.selected_flavor}` : ''}
                  {item.selected_weight ? ` · ${item.selected_weight} lb` : ''}
                  {item.selected_size ? ` · ${item.selected_size}` : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="border border-gray-100 rounded-xl p-4 space-y-2 text-sm">
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
            type="button"
            onClick={placeOrder}
            disabled={loading || !stripe || !elements}
            className="w-full mt-6 text-white font-bold py-3 rounded-xl disabled:opacity-60"
            style={{ background: 'var(--navy)' }}
          >
            {loading ? 'Authorizing card...' : `Place Order — $${total.toFixed(2)}`}
          </button>

          <button
            type="button"
            onClick={onBackToPayment}
            disabled={loading}
            className="w-full mt-3 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            Back to Payment
          </button>
        </div>
      )}
    </div>
  )
}
