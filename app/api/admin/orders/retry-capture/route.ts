import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { toCents } from '@/lib/checkout-pricing'
import { requireAdmin } from '@/lib/admin-auth'
import { displayBuyerName } from '@/lib/order-buyer'
import { sendPushNotifications } from '@/lib/push-server'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { supabase } = admin
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.payment_failed_at) {
      return NextResponse.json({ error: 'This order does not have a failed payment to retry' }, { status: 400 })
    }

    if (!order.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'This order has no payment to retry' }, { status: 400 })
    }

    let captureFailed = false
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)

      if (paymentIntent.status === 'requires_capture') {
        await stripe.paymentIntents.capture(order.stripe_payment_intent_id, {
          amount_to_capture: toCents(order.total),
        })
      } else if (paymentIntent.status !== 'succeeded') {
        captureFailed = true
      }
    } catch (captureError) {
      console.error('[retry-capture] Capture failed', {
        orderId,
        message: captureError instanceof Error ? captureError.message : captureError,
      })
      captureFailed = true
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_failed_at: captureFailed ? new Date().toISOString() : null })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    try {
      await sendPushNotifications({
        title: captureFailed ? '⚠️ Retry failed' : '✅ Payment charged',
        body: captureFailed
          ? `${order.order_number} — ${displayBuyerName(order)} — card still did not go through`
          : `${order.order_number} — ${displayBuyerName(order)} — charged $${Number(order.total).toFixed(2)}`,
        url: `/boss/orders/${orderId}`,
        tag: `capture-${orderId}`,
      })
    } catch (pushError) {
      console.error('[retry-capture] Push notification failed', pushError)
    }

    return NextResponse.json({ success: true, paymentFailed: captureFailed })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not retry payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
