import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'
import { deductInventoryOnApproval } from '@/lib/deduct-inventory'
import { sendOrderApproval } from '@/lib/email'
import { toCents } from '@/lib/checkout-pricing'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    const supabase = createServerClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be approved' }, { status: 400 })
    }

    if (order.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(order.stripe_payment_intent_id, {
        amount_to_capture: toCents(order.total),
      })
    }

    try {
      await deductInventoryOnApproval(supabase, orderId, order.order_number)
    } catch (inventoryError) {
      console.error('Inventory deduction failed', inventoryError)
      return NextResponse.json(
        { error: inventoryError instanceof Error ? inventoryError.message : 'Inventory deduction failed' },
        { status: 500 },
      )
    }

    await supabase.from('orders').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    }).eq('id', orderId)

    try {
      console.log('[email] About to send order approval', {
        orderId,
        orderNumber: order.order_number,
      })
      await sendOrderApproval(order)
      console.log('[email] Finished sending order approval', {
        orderId,
        orderNumber: order.order_number,
      })
    } catch (emailError) {
      console.error('Order approval email failed', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not capture payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
