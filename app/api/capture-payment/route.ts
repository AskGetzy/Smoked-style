import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    const supabase = createServerClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('stripe_payment_intent_id, total')
      .eq('id', orderId)
      .single()

    if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(order.stripe_payment_intent_id)
    }

    await supabase.from('orders').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    }).eq('id', orderId)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
