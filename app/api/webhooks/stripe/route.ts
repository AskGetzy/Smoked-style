import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const supabase = createServerClient()

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any
    await supabase.from('orders')
      .update({ status: 'cancelled' })
      .eq('stripe_payment_intent_id', pi.id)
  }

  return NextResponse.json({ received: true })
}
