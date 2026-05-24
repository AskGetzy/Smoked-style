import { NextRequest, NextResponse } from 'next/server'
import { sendOrderDelivered, sendOrderReadyForPickup } from '@/lib/email'
import { requireAdmin } from '@/lib/admin-auth'
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

    const update: Record<string, string | null> = { status }
    if (status === 'delivered') {
      update.delivered_at = new Date().toISOString()
    } else if (order.status === 'delivered' || status === 'pending' || status === 'approved') {
      update.delivered_at = null
    }
    if (status === 'pending') {
      update.approved_at = null
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(update)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
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

    return NextResponse.json({ success: true, status })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not update order status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
