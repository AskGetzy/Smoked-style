import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'
import {
  amountsMatch,
  priceCartLines,
  sumSubtotal,
  type CheckoutCartLine,
} from '@/lib/checkout-pricing'
import { sendOrderConfirmation } from '@/lib/email'
import type { Product } from '@/types'

type CreateOrderBody = {
  paymentIntentId: string
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

async function resolveCustomerId(
  supabase: ReturnType<typeof createServerClient>,
  userId: string | undefined,
  contact: CreateOrderBody['contact'],
): Promise<string> {
  const full_name = contact.name.trim()
  const email = contact.email.trim().toLowerCase()
  const phone = contact.phone?.trim() || null

  if (userId) {
    const { error: upsertError } = await supabase
      .from('customers')
      .upsert({ id: userId, full_name, email, phone }, { onConflict: 'id' })

    if (upsertError) {
      throw new Error(`Customer upsert failed: ${upsertError.message}`)
    }

    return userId
  }

  const { data: existingByEmail } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingByEmail) {
    const { error: updateError } = await supabase
      .from('customers')
      .update({ full_name, phone })
      .eq('id', existingByEmail.id)

    if (updateError) throw new Error(`Customer update failed: ${updateError.message}`)
    return existingByEmail.id
  }

  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert({ full_name, email, phone })
    .select('id')
    .single()

  if (insertError || !newCustomer) {
    throw new Error(insertError?.message ?? 'Could not create customer')
  }

  return newCustomer.id
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderBody
    const {
      paymentIntentId,
      cart,
      contact,
      orderType,
      areaId,
      address,
      recipientName,
      recipientPhone,
      deliveryDate,
      notes,
      giftMessage,
      userId,
    } = body

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing payment authorization' }, { status: 400 })
    }
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

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json({
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
      })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (paymentIntent.status !== 'requires_capture') {
      return NextResponse.json(
        { error: `Payment was not authorized. Current status: ${paymentIntent.status}` },
        { status: 400 },
      )
    }

    const productIds = Array.from(new Set(cart.map((line) => line.product_id)))
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)

    if (productsError) throw new Error(productsError.message)
    if (!products || products.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products are invalid' }, { status: 400 })
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
    if (!amountsMatch(total, paymentIntent.amount)) {
      return NextResponse.json(
        { error: 'Authorized payment amount does not match order total' },
        { status: 400 },
      )
    }

    const customerId = await resolveCustomerId(supabase, userId, contact)

    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const orderNumber = `SS-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        status: 'pending',
        order_type: orderType,
        delivery_area_id: orderType === 'delivery' ? areaId : null,
        delivery_address: orderType === 'delivery' ? address?.trim() : null,
        delivery_date: deliveryDate,
        recipient_name: recipientName?.trim() || null,
        recipient_phone: recipientPhone?.trim() || null,
        subtotal,
        delivery_fee: deliveryFee,
        custom_adjustment: 0,
        total,
        order_notes: notes?.trim() || null,
        gift_message: giftMessage?.trim() || null,
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select('id')
      .single()

    if (orderError) {
      await stripe.paymentIntents.cancel(paymentIntent.id)
      throw new Error(orderError.message)
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      pricedLines.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        product_name: line.product_name,
        quantity: line.quantity,
        selected_flavor: line.selected_flavor,
        selected_weight: line.selected_weight,
        selected_size: line.selected_size,
        unit_price: line.unit_price,
        line_total: line.line_total,
      })),
    )

    if (itemsError) {
      await stripe.paymentIntents.cancel(paymentIntent.id)
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(itemsError.message)
    }

    await stripe.paymentIntents.update(paymentIntent.id, {
      description: `Smoked Style Order ${orderNumber}`,
      metadata: {
        ...paymentIntent.metadata,
        orderNumber,
        orderId: order.id,
      },
    })

    try {
      console.log('[email] About to send order confirmation', { orderId: order.id, orderNumber })
      await sendOrderConfirmation({
        order_number: orderNumber,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? address?.trim() : null,
        delivery_date: deliveryDate,
        recipient_name: recipientName?.trim() || null,
        recipient_phone: recipientPhone?.trim() || null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customers: {
          full_name: contact.name.trim(),
          email: contact.email.trim().toLowerCase(),
          phone: contact.phone?.trim() || null,
        },
        order_items: pricedLines.map((line) => ({
          product_name: line.product_name,
          quantity: line.quantity,
          selected_flavor: line.selected_flavor,
          selected_weight: line.selected_weight,
          selected_size: line.selected_size,
          unit_price: line.unit_price,
          line_total: line.line_total,
        })),
      })
      console.log('[email] Finished sending order confirmation', { orderId: order.id, orderNumber })
    } catch (emailError) {
      console.error('Order confirmation email failed', emailError)
    }

    return NextResponse.json({ orderId: order.id, orderNumber })
  } catch (e: unknown) {
    console.error(e)
    const message = e instanceof Error ? e.message : 'Could not create order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
