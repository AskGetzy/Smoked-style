import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendOrderRejection } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { orderId, reason } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    const rejectionReason = String(reason || 'We were unable to approve this order.').trim()
    const supabase = createServerClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    try {
      console.log('[email] About to send order rejection', {
        orderId,
        orderNumber: order.order_number,
      })
      await sendOrderRejection({ ...order, status: 'cancelled' }, rejectionReason)
      console.log('[email] Finished sending order rejection', {
        orderId,
        orderNumber: order.order_number,
      })
    } catch (emailError) {
      console.error('Order rejection email failed', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not reject order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
