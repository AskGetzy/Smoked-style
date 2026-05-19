import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { toCents } from '@/lib/checkout-pricing'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const body = await req.json()
    const subtotal = Number(body.subtotal ?? 0)
    const deliveryFee = Number(body.deliveryFee ?? 0)
    const total = subtotal + deliveryFee
    const email = String(body.email || '').trim().toLowerCase()

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'Order total must be greater than zero' }, { status: 400 })
    }

    const amountCents = toCents(total)
    if (amountCents < 50) {
      return NextResponse.json({ error: 'Order total is too low' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true },
      description: 'Smoked Style boss order authorization',
      ...(email ? { receipt_email: email, metadata: { customerEmail: email } } : {}),
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subtotal,
      deliveryFee,
      total,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not start card payment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
