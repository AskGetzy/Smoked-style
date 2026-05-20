'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import Header from '@/components/Header'
import CheckoutPaymentForm from '@/components/CheckoutPaymentForm'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { toLocalDateString } from '@/lib/dates'
import type { CartItem, DeliveryArea } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const STEPS = ['Contact', 'Delivery', 'Date', 'Payment', 'Review']

type PaymentInit = {
  clientSecret: string
  paymentIntentId: string
  subtotal: number
  deliveryFee: number
  total: number
}

export default function CheckoutPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [error, setError] = useState('')
  const [preparingPayment, setPreparingPayment] = useState(false)
  const [paymentInit, setPaymentInit] = useState<PaymentInit | null>(null)

  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [areaId, setAreaId] = useState('')
  const [address, setAddress] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [giftMessage, setGiftMessage] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('smoked-cart')
    if (stored) setCart(JSON.parse(stored))
    setNotes(localStorage.getItem('smoked-notes') ?? '')
    setGiftMessage(localStorage.getItem('smoked-gift') ?? '')
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUser(u)
      if (u) {
        setContact({
          name: u.user_metadata?.full_name ?? '',
          email: u.email ?? '',
          phone: '',
        })
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        setContact({
          name: u.user_metadata?.full_name ?? '',
          email: u.email ?? '',
          phone: '',
        })
      }
    })
    fetchAreas()
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  async function fetchAreas() {
    const { data } = await supabase
      .from('delivery_areas')
      .select('*')
      .eq('is_active', true)
      .eq('is_backend_only', false)
    setAreas(data ?? [])
    if (data && data.length > 0) setAreaId(data[0].id)
  }

  const selectedArea = areas.find((a) => a.id === areaId)
  const displaySubtotal = cart.reduce((s, i) => s + i.line_total, 0)
  const displayDeliveryFee =
    orderType === 'delivery' ? (selectedArea?.delivery_fee ?? 30) : 0
  const displayTotal = displaySubtotal + displayDeliveryFee
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const subtotal = paymentInit?.subtotal ?? displaySubtotal
  const deliveryFee = paymentInit?.deliveryFee ?? displayDeliveryFee
  const total = paymentInit?.total ?? displayTotal
  const clientSecret = paymentInit?.clientSecret ?? ''

  useEffect(() => {
    if (step === 3) {
      console.log('Checkout Step 4 clientSecret:', clientSecret)
    }
  }, [step, clientSecret])

  function validateBeforePayment(): string | null {
    if (!contact.name.trim() || !contact.email.trim() || !contact.phone.trim()) {
      return 'Please complete your contact information.'
    }
    if (orderType === 'delivery' && (!areaId || !address.trim())) {
      return 'Please enter your delivery area and address.'
    }
    if (!deliveryDate) {
      return 'Please choose a delivery date.'
    }
    if (cart.length === 0) {
      return 'Your cart is empty.'
    }
    return null
  }

  const initializePayment = useCallback(async () => {
    const validationError = validateBeforePayment()
    if (validationError) {
      setError(validationError)
      return false
    }

    setPreparingPayment(true)
    setError('')
    setPaymentInit(null)

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            selected_flavor: item.selected_flavor,
            selected_weight: item.selected_weight,
            selected_size: item.selected_size,
          })),
          contact,
          orderType,
          areaId: orderType === 'delivery' ? areaId : undefined,
          address: orderType === 'delivery' ? address : undefined,
          recipientName,
          recipientPhone,
          deliveryDate,
          notes,
          giftMessage,
          userId: user?.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not start payment')
      console.log('Fetched Stripe clientSecret:', data.clientSecret)

      setPaymentInit({
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        total: data.total,
      })
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start payment')
      return false
    } finally {
      setPreparingPayment(false)
    }
  }, [
    cart,
    contact,
    orderType,
    areaId,
    address,
    recipientName,
    recipientPhone,
    deliveryDate,
    notes,
    giftMessage,
    user?.id,
  ])

  async function goToPaymentStep() {
    const validationError = validateBeforePayment()
    if (validationError) {
      setError(validationError)
      return
    }
    setStep(3)
    await initializePayment()
  }

  function handlePaymentSuccess(orderNumber: string) {
    localStorage.removeItem('smoked-cart')
    localStorage.removeItem('smoked-notes')
    localStorage.removeItem('smoked-gift')
    router.push(`/confirmation?order=${encodeURIComponent(orderNumber)}`)
  }

  function handleBackFromPayment() {
    setStep(2)
    setPaymentInit(null)
    setError('')
  }

  const checkoutPayload = {
    cart: cart.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      selected_flavor: item.selected_flavor,
      selected_weight: item.selected_weight,
      selected_size: item.selected_size,
    })),
    contact,
    orderType,
    areaId: orderType === 'delivery' ? areaId : undefined,
    address: orderType === 'delivery' ? address : undefined,
    recipientName,
    recipientPhone,
    deliveryDate,
    notes,
    giftMessage,
    userId: user?.id,
  }

  const today = new Date()
  const getCalendarDays = () => {
    const days: Date[] = []
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      days.push(d)
    }
    return days
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Header
        cartCount={cartCount}
        cartTotal={displayTotal}
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={() => supabase.auth.signOut()}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < step
                      ? 'bg-green-500 text-white'
                      : i === step
                        ? 'text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                  style={i === step ? { background: 'var(--navy)' } : {}}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4">Contact Information</h2>
              <div className="space-y-3">
                <input
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                />
                <input
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="Email"
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                />
                <input
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="Phone / WhatsApp"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold mb-4">Delivery or Pickup?</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(['delivery', 'pickup'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`py-3 rounded-xl font-semibold text-sm border-2 capitalize ${
                      orderType === type
                        ? 'border-orange-500 text-orange-600 bg-orange-50'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}
                  </button>
                ))}
              </div>
              {orderType === 'delivery' && (
                <>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Delivery Area
                  </label>
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-orange-400"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — ${a.delivery_fee} delivery fee
                      </option>
                    ))}
                  </select>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Delivery Address"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-orange-400"
                  />
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient Name (if different)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-orange-400"
                  />
                  <input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="Recipient Phone"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  />
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold mb-2">Choose Delivery Date</h2>
              <p className="mb-4 text-sm font-semibold text-gray-800">
                Select your preferred delivery or pickup date.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {getCalendarDays().map((d) => {
                  const isSat = d.getDay() === 6
                  const isFri = d.getDay() === 5
                  const iso = toLocalDateString(d)
                  const isSelected = deliveryDate === iso
                  const label = d.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isSat}
                      onClick={() => !isSat && setDeliveryDate(iso)}
                      className={`relative p-2 rounded-xl text-xs font-medium border-2 transition-all ${
                        isSat
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : isSelected
                            ? 'border-orange-500 text-orange-700 bg-orange-50 shadow-sm'
                            : isFri
                              ? 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {isFri && !isSat && (
                        <span
                          className="absolute right-1 top-1 text-[10px] font-bold leading-none text-amber-600"
                          aria-hidden
                        >
                          *
                        </span>
                      )}
                      {label.split(', ').map((l, i) => (
                        <div key={i}>{l}</div>
                      ))}
                      {isSat && <div className="text-gray-300">Closed</div>}
                      {isFri && !isSat && (
                        <div className={`mt-0.5 text-[10px] font-semibold ${isSelected ? 'text-orange-600' : 'text-amber-700'}`}>
                          ⚠ Limited
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                ⚠️ Orders placed on Erev Shabbos or Erev Yom Tov may have limited delivery availability. For these
                dates, orders placed after 11:00 AM must be called in to confirm —{' '}
                <a href="tel:7188109472" className="font-bold underline">
                  (718) 810-9472
                </a>
              </p>
            </div>
          )}

          {(step === 3 || step === 4) && (
            <div>
              {step === 3 && (
                <>
                  <h2 className="text-lg font-bold mb-1">Payment</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Your card will be <strong>authorized</strong> but not charged until we
                    approve your order.
                  </p>
                </>
              )}

              {preparingPayment && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-orange-500" />
                  <p className="text-sm text-gray-500">Preparing secure payment...</p>
                </div>
              )}

              {clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: "stripe" }
                  }}
                >
                  <CheckoutPaymentForm
                    step={step}
                    paymentIntentId={paymentInit?.paymentIntentId ?? ''}
                    subtotal={subtotal}
                    deliveryFee={deliveryFee}
                    total={total}
                    checkoutPayload={checkoutPayload}
                    onReviewReady={() => {
                      setError('')
                      setStep(4)
                    }}
                    onBackToPayment={() => {
                      setError('')
                      setStep(3)
                    }}
                    onSuccess={handlePaymentSuccess}
                    onError={setError}
                  />
                </Elements>
              )}

              {!preparingPayment && !clientSecret && (
                <div className="text-center py-6">
                  <p className="text-sm text-red-500 mb-3">
                    Payment could not be initialized. Missing Stripe client secret.
                  </p>
                  <button
                    type="button"
                    onClick={() => initializePayment()}
                    className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Try again
                  </button>
                </div>
              )}

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            </div>
          )}

          {error && step !== 3 && step !== 4 && (
            <p className="text-red-500 text-sm mt-3">{error}</p>
          )}

          {step < 3 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button
                  onClick={() => {
                    setStep((s) => s - 1)
                    setError('')
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              {step < 2 ? (
                <button
                  onClick={() => {
                    setError('')
                    setStep((s) => s + 1)
                  }}
                  className="flex-1 text-white font-bold py-3 rounded-xl"
                  style={{ background: 'var(--navy)' }}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={goToPaymentStep}
                  disabled={preparingPayment}
                  className="flex-1 text-white font-bold py-3 rounded-xl disabled:opacity-60"
                  style={{ background: 'var(--navy)' }}
                >
                  {preparingPayment ? 'Loading...' : 'Continue to Payment'}
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleBackFromPayment}
                className="w-full py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
