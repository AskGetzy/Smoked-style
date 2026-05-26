import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'
import {
  priceCartLines,
  sumSubtotal,
  toCents,
  type CheckoutCartLine,
} from '@/lib/checkout-pricing'
import type { Product } from '@/types'

type CheckoutBody = {
  cart: CheckoutCartLine[]
  contact: { name: string; email: string; phone: string }
  orderType: 'delivery' | 'pickup'
  areaId?: string
  address?: string
  recipientName?: string
  recipientPhone?: string
  deliveryDate?: string
  notes?: string
  giftMessage?: string
  userId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody
    const {
      cart,
      contact,
      orderType,
      areaId,
      address,
      deliveryDate,
    } = body

    if (!contact?.name?.trim() || !contact?.email?.trim() || !contact?.phone?.trim()) {
      return NextResponse.json({ error: 'Name, email, and phone are required' }, { status: 400 })
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (orderType === 'delivery' && (!areaId || !address?.trim())) {
      return NextResponse.json(
        { error: 'Delivery area and address are required' },
        { status: 400 },
      )
    }

    if (!deliveryDate) {
      return NextResponse.json({ error: 'Delivery date is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const productIds = Array.from(new Set(cart.map((line) => line.product_id)))
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)

    if (productsError) throw new Error(productsError.message)
    if (!products || products.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products are invalid' }, { status: 400 })
    }
    if (products.some((product) => product.is_customer_visible === false)) {
      return NextResponse.json(
        { error: 'One or more items are no longer available' },
        { status: 400 },
      )
    }

    const productsById = new Map<string, Product>(
      products.map((p) => [p.id, p as Product]),
    )

    const pricedLines = priceCartLines(cart, productsById)
    const subtotal = sumSubtotal(pricedLines)

    let deliveryFee = 0
    if (orderType === 'delivery') {
      const { data: area, error: areaError } = await supabase
        .from('delivery_areas')
        .select('id, delivery_fee, is_active, is_backend_only')
        .eq('id', areaId)
        .single()

      if (areaError || !area) {
        return NextResponse.json({ error: 'Invalid delivery area' }, { status: 400 })
      }
      if (!area.is_active || area.is_backend_only) {
        return NextResponse.json({ error: 'Delivery area is not available' }, { status: 400 })
      }
      deliveryFee = Number(area.delivery_fee)
    }

    const total = subtotal + deliveryFee
    const amountCents = toCents(total)

    if (amountCents < 50) {
      return NextResponse.json({ error: 'Order total is too low' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true },
      description: 'Smoked Style order authorization',
      metadata: {
        customerEmail: contact.email.trim().toLowerCase(),
      },
      receipt_email: contact.email.trim(),
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subtotal,
      deliveryFee,
      total,
    })
  } catch (e: unknown) {
    console.error(e)
    const message = e instanceof Error ? e.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
