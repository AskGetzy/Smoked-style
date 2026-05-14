import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, cart, contact, orderType, areaId, address, recipientName, recipientPhone, deliveryDate, notes, giftMessage, userId } = body

    const supabase = createServerClient()

    // Generate order number
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const orderNumber = `SS-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`

    // Get or create customer
    let customerId = userId
    if (!customerId) {
      const { data: existing } = await supabase.from('customers').select('id').eq('email', contact.email).single()
      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCustomer } = await supabase.from('customers').insert({
          full_name: contact.name,
          email: contact.email,
          phone: contact.phone,
          tags: [],
        }).select('id').single()
        customerId = newCustomer?.id
      }
    }

    // Create Stripe payment intent (authorize only, capture later)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      capture_method: 'manual',
      description: `Smoked Style Order ${orderNumber}`,
      metadata: { orderNumber },
    })

    // Calculate totals
    const subtotal = cart.reduce((s: number, i: any) => s + i.line_total, 0)
    const deliveryFee = orderType === 'delivery' ? (body.deliveryFee ?? 30) : 0

    // Create order
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      order_number: orderNumber,
      customer_id: customerId,
      status: 'pending',
      order_type: orderType,
      delivery_area_id: orderType === 'delivery' ? areaId : null,
      delivery_address: address || null,
      delivery_date: deliveryDate || null,
      recipient_name: recipientName || null,
      recipient_phone: recipientPhone || null,
      subtotal,
      delivery_fee: deliveryFee,
      custom_adjustment: 0,
      total: subtotal + deliveryFee,
      order_notes: notes || null,
      gift_message: giftMessage || null,
      stripe_payment_intent_id: paymentIntent.id,
    }).select('id').single()

    if (orderError) throw new Error(orderError.message)

    // Create order items
    if (order) {
      await supabase.from('order_items').insert(
        cart.map((item: any) => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          selected_flavor: item.selected_flavor,
          selected_weight: item.selected_weight,
          selected_size: item.selected_size,
          unit_price: item.unit_price,
          line_total: item.line_total,
        }))
      )
    }

    return NextResponse.json({ orderNumber, clientSecret: paymentIntent.client_secret })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
