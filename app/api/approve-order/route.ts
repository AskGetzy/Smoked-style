import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/admin-auth'
import { deductInventoryOnApproval } from '@/lib/deduct-inventory'
import { sendOrderApproval } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { supabase } = admin
    const { orderId } = await req.json()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be approved' }, { status: 400 })
    }

    // The card is not charged here — it's only authorized. The actual charge
    // happens when the order moves to out_for_delivery/ready_for_pickup/delivered
    // (see app/api/admin/orders/status/route.ts), so it stays editable in the
    // meantime. Just confirm the authorization hold is still valid.
    if (order.stripe_payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)

      if (paymentIntent.status !== 'requires_capture' && paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          {
            error: `This order's payment authorization is no longer valid (Stripe status: ${paymentIntent.status}). The customer may need to place a new order.`,
          },
          { status: 400 },
        )
      }
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
      await sendOrderApproval(order)
    } catch (emailError) {
      console.error('Order approval email failed', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not approve order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
