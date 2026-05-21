import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'
import { displayBuyerName } from '@/lib/order-buyer'
import {
  sendPaymentFailedAdmin,
  sendPaymentFailedCustomer,
  type EmailOrder,
} from '@/lib/email'

type OrderRow = {
  id: string
  order_number: string
  status: string
  order_notes: string | null
  total: number
  buyer_name: string | null
  buyer_email: string | null
  buyer_phone: string | null
  customers?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
}

function formatRefundDate(date = new Date()): string {
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function appendOrderNote(existing: string | null, line: string): string {
  const trimmed = existing?.trim()
  return trimmed ? `${trimmed}\n${line}` : line
}

async function findOrderByPaymentIntentId(
  supabase: ReturnType<typeof createServerClient>,
  paymentIntentId: string,
) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, order_notes, total, buyer_name, buyer_email, buyer_phone, customers(full_name, email, phone)')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (error) {
    console.error('[stripe-webhook] Order lookup failed', { paymentIntentId, message: error.message })
    return null
  }

  return data as OrderRow | null
}

function toEmailOrder(order: OrderRow): EmailOrder {
  return {
    order_number: order.order_number,
    total: Number(order.total),
    customers: {
      full_name: displayBuyerName(order),
      email: order.buyer_email || order.customers?.email || null,
      phone: order.buyer_phone || order.customers?.phone || null,
    },
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createServerClient>,
  paymentIntent: Stripe.PaymentIntent,
) {
  const order = await findOrderByPaymentIntentId(supabase, paymentIntent.id)
  if (!order) {
    console.warn('[stripe-webhook] payment_intent.payment_failed: no order found', {
      paymentIntentId: paymentIntent.id,
    })
    return
  }

  const failedAt = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'payment_failed', payment_failed_at: failedAt })
    .eq('id', order.id)

  if (error) {
    console.error('[stripe-webhook] Failed to mark order payment_failed', {
      orderId: order.id,
      message: error.message,
    })
    return
  }

  console.log('[stripe-webhook] Order marked payment_failed', {
    orderId: order.id,
    orderNumber: order.order_number,
    paymentIntentId: paymentIntent.id,
  })

  const customerName = displayBuyerName(order)

  try {
    await sendPaymentFailedAdmin(order.order_number, customerName)
    console.log('[stripe-webhook] Admin payment-failed email sent', {
      orderNumber: order.order_number,
    })
  } catch (emailError) {
    console.error('[stripe-webhook] Admin payment-failed email failed', emailError)
  }

  try {
    await sendPaymentFailedCustomer(toEmailOrder(order))
    console.log('[stripe-webhook] Customer payment-failed email sent', {
      orderNumber: order.order_number,
    })
  } catch (emailError) {
    console.error('[stripe-webhook] Customer payment-failed email failed', emailError)
  }
}

async function handlePaymentCanceled(
  supabase: ReturnType<typeof createServerClient>,
  paymentIntent: Stripe.PaymentIntent,
) {
  const order = await findOrderByPaymentIntentId(supabase, paymentIntent.id)
  if (!order) {
    console.warn('[stripe-webhook] payment_intent.canceled: no order found', {
      paymentIntentId: paymentIntent.id,
    })
    return
  }

  if (order.status !== 'pending') {
    console.log('[stripe-webhook] payment_intent.canceled: order not pending, skipping', {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
    })
    return
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order.id)

  if (error) {
    console.error('[stripe-webhook] Failed to cancel order', {
      orderId: order.id,
      message: error.message,
    })
    return
  }

  console.log('[stripe-webhook] Pending order cancelled', {
    orderId: order.id,
    orderNumber: order.order_number,
    paymentIntentId: paymentIntent.id,
  })
}

async function handleChargeRefunded(
  supabase: ReturnType<typeof createServerClient>,
  charge: Stripe.Charge,
) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id

  if (!paymentIntentId) {
    console.warn('[stripe-webhook] charge.refunded: charge has no payment_intent', {
      chargeId: charge.id,
    })
    return
  }

  const order = await findOrderByPaymentIntentId(supabase, paymentIntentId)
  if (!order) {
    console.warn('[stripe-webhook] charge.refunded: no order found', {
      paymentIntentId,
      chargeId: charge.id,
    })
    return
  }

  const refundedAt = new Date().toISOString()
  const noteLine = `Refunded on ${formatRefundDate(new Date(refundedAt))}`
  const { error } = await supabase
    .from('orders')
    .update({
      refunded_at: refundedAt,
      order_notes: appendOrderNote(order.order_notes, noteLine),
    })
    .eq('id', order.id)

  if (error) {
    console.error('[stripe-webhook] Failed to record refund on order', {
      orderId: order.id,
      message: error.message,
    })
    return
  }

  console.log('[stripe-webhook] Refund recorded on order', {
    orderId: order.id,
    orderNumber: order.order_number,
    paymentIntentId,
    chargeId: charge.id,
    noteLine,
  })
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.warn('[stripe-webhook] Rejected request: missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.warn('[stripe-webhook] Rejected request: signature verification failed', { message })
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  console.log('[stripe-webhook] Event received', {
    eventId: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    apiVersion: event.api_version,
  })

  const supabase = createServerClient()

  try {
    switch (event.type) {
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[stripe-webhook] Handling payment_intent.payment_failed', {
          paymentIntentId: paymentIntent.id,
          lastPaymentError: paymentIntent.last_payment_error?.message ?? null,
        })
        await handlePaymentFailed(supabase, paymentIntent)
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[stripe-webhook] Handling payment_intent.canceled', {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        })
        await handlePaymentCanceled(supabase, paymentIntent)
        break
      }

      case 'payment_intent.amount_capturable_updated': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[stripe-webhook] payment_intent.amount_capturable_updated (debug only)', {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amountCapturable: paymentIntent.amount_capturable,
          amount: paymentIntent.amount,
        })
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('[stripe-webhook] Handling charge.refunded', {
          chargeId: charge.id,
          paymentIntentId: charge.payment_intent,
          amountRefunded: charge.amount_refunded,
        })
        await handleChargeRefunded(supabase, charge)
        break
      }

      default:
        console.log('[stripe-webhook] Unhandled event type (no action)', { type: event.type })
    }
  } catch (handlerError) {
    console.error('[stripe-webhook] Handler error', {
      type: event.type,
      eventId: event.id,
      error: handlerError,
    })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  console.log('[stripe-webhook] Event processed successfully', {
    eventId: event.id,
    type: event.type,
  })

  return NextResponse.json({ received: true })
}
