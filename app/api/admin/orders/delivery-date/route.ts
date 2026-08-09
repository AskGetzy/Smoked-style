import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { normalizeDeliveryDate } from '@/lib/dates'
import { sendOrderDateChanged } from '@/lib/email'

const LOCKED_STATUSES = new Set(['delivered', 'cancelled', 'payment_failed'])

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { supabase } = admin
    const { orderId, deliveryDate } = await req.json()
    const normalized = normalizeDeliveryDate(deliveryDate)

    if (!orderId || !normalized) {
      return NextResponse.json({ error: 'Missing order ID or a valid date' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (LOCKED_STATUSES.has(order.status)) {
      return NextResponse.json(
        { error: `Cannot change the date on a ${order.status.replace(/_/g, ' ')} order` },
        { status: 400 },
      )
    }

    const previousDate = normalizeDeliveryDate(order.delivery_date)
    if (previousDate === normalized) {
      return NextResponse.json({ order })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ delivery_date: normalized })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: updatedOrder, error: updatedError } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (updatedError || !updatedOrder) {
      throw new Error(updatedError?.message ?? 'Could not reload updated order')
    }

    try {
      await sendOrderDateChanged(updatedOrder, previousDate)
    } catch (emailError) {
      console.error('Order date-change email failed', emailError)
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not update delivery date'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
