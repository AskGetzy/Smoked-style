import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { toCents } from '@/lib/checkout-pricing'
import {
  sendOrderDelivered,
  sendOrderReadyForPickup,
  sendPaymentFailedAdmin,
  sendPaymentFailedCustomer,
} from '@/lib/email'
import { sendPushNotifications } from '@/lib/push-server'
import { requireAdmin } from '@/lib/admin-auth'
import { displayBuyerName } from '@/lib/order-buyer'
import {
  canSetOrderStatus,
  getRevertStatus,
  statusRequiresPickupOnly,
} from '@/lib/order-status'
import type { Order } from '@/types'

const LEGACY_FORWARD: Record<string, string[]> = {
  approved: ['out_for_delivery', 'ready_for_pickup'],
  out_for_delivery: ['delivered'],
  ready_for_pickup: ['delivered'],
}

const CAPTURE_TRIGGER_STATUSES = new Set(['out_for_delivery', 'ready_for_pickup', 'delivered'])

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { orderId, status: requestedStatus, revert } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    const { supabase } = admin
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let status: Order['status']
    if (revert) {
      const previous = getRevertStatus(order)
      if (!previous) {
        return NextResponse.json(
          { error: `Cannot revert order from ${order.status}` },
          { status: 400 },
        )
      }
      status = previous
    } else if (!requestedStatus) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 })
    } else {
      status = requestedStatus as Order['status']
    }

    const allowedByRules = canSetOrderStatus(order, status)
    const allowedLegacy = LEGACY_FORWARD[order.status]?.includes(status) ?? false

    if (!allowedByRules && !allowedLegacy) {
      return NextResponse.json(
        { error: `Cannot change order from ${order.status} to ${status}` },
        { status: 400 },
      )
    }

    if (statusRequiresPickupOnly(status) && order.order_type !== 'pickup') {
      return NextResponse.json(
        { error: 'Only pickup orders can be marked ready for pickup' },
        { status: 400 },
      )
    }

    if (status === 'out_for_delivery' && order.order_type === 'pickup') {
      return NextResponse.json(
        { error: 'Pickup orders cannot be marked out for delivery' },
        { status: 400 },
      )
    }

    // The card is only authorized when the order is approved. The first time it
    // leaves 'approved' heading toward fulfillment, attempt the actual charge.
    // Per business decision: a failed charge does NOT block fulfillment — the
    // order still moves forward, but gets flagged (payment_failed_at) so staff
    // can follow up, rather than holding up a delivery/pickup over a bad card.
    const capturingNow =
      !revert && order.status === 'approved' && CAPTURE_TRIGGER_STATUSES.has(status)

    let captureAttempted = false
    let captureFailed = false

    if (capturingNow && order.stripe_payment_intent_id) {
      captureAttempted = true
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
        console.error('[order-status] Capture failed', {
          orderId,
          message: captureError instanceof Error ? captureError.message : captureError,
        })
        captureFailed = true
      }
    }

    const update: Record<string, string | null> = { status }
    if (status === 'delivered') {
      update.delivered_at = new Date().toISOString()
    } else if (order.status === 'delivered' || status === 'pending' || status === 'approved') {
      update.delivered_at = null
    }
    if (status === 'pending') {
      update.approved_at = null
    }
    if (captureAttempted) {
      update.payment_failed_at = captureFailed ? new Date().toISOString() : null
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(update)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (captureAttempted) {
      const wasAlreadyFlagged = Boolean(order.payment_failed_at)
      try {
        await sendPushNotifications({
          title: captureFailed ? '⚠️ Payment failed' : '✅ Payment charged',
          body: captureFailed
            ? `${order.order_number} — ${displayBuyerName(order)} — card did not go through`
            : `${order.order_number} — ${displayBuyerName(order)} — charged $${Number(order.total).toFixed(2)}`,
          url: `/boss/orders/${orderId}`,
          tag: `capture-${orderId}`,
        })
      } catch (pushError) {
        console.error('[order-status] Capture push notification failed', pushError)
      }

      if (captureFailed && !wasAlreadyFlagged) {
        try {
          await sendPaymentFailedAdmin(order.order_number, displayBuyerName(order))
        } catch (emailError) {
          console.error('Payment failed admin email failed', emailError)
        }
        try {
          await sendPaymentFailedCustomer(order)
        } catch (emailError) {
          console.error('Payment failed customer email failed', emailError)
        }
      }
    }

    const movingForward =
      !revert &&
      (LEGACY_FORWARD[order.status]?.includes(status) ||
        (order.status !== status && status === 'delivered'))

    const emailOrder = { ...order, status, delivered_at: update.delivered_at ?? order.delivered_at }

    if (movingForward && status === 'delivered' && order.order_type === 'delivery') {
      try {
        await sendOrderDelivered(emailOrder)
      } catch (emailError) {
        console.error('Order delivered email failed', emailError)
      }
    }

    if (movingForward && status === 'ready_for_pickup') {
      try {
        await sendOrderReadyForPickup(emailOrder)
      } catch (emailError) {
        console.error('Order ready for pickup email failed', emailError)
      }
    }

    return NextResponse.json({ success: true, status, paymentFailed: captureFailed })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not update order status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
