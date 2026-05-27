import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { amountsMatch } from '@/lib/checkout-pricing'
import { normalizeDeliveryDate } from '@/lib/dates'
import { sendOrderConfirmation } from '@/lib/email'
import { sendNewOrderPushNotification } from '@/lib/send-new-order-push'
import {
  customerPatchFromSavedAddresses,
  type CustomerSavedAddresses,
} from '@/lib/customer-saved-addresses'
import { findOrCreateCustomer } from '@/lib/customers-server'
import { stripe } from '@/lib/stripe'

type BossOrderItem = {
  product_id: string
  product_name: string
  quantity: number
  selected_flavor?: string | null
  selected_weight?: number | null
  selected_size?: string | null
  unit_price: number
  line_total: number
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { supabase } = admin
    const body = await req.json()
    const items = (Array.isArray(body.items) ? body.items : []) as BossOrderItem[]
    const customer = body.customer ?? {}
    const orderType = body.orderType === 'pickup' ? 'pickup' : 'delivery'
    const deliveryFee = Number(body.deliveryFee ?? 0)
    const normalizedDeliveryDate = normalizeDeliveryDate(String(body.deliveryDate || ''))
    const notes = String(body.notes || '').trim() || null

    if (!customer.full_name?.trim() || !customer.phone?.trim()) {
      return NextResponse.json({ error: 'Customer name and phone are required' }, { status: 400 })
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Add at least one item' }, { status: 400 })
    }
    if (!normalizedDeliveryDate) {
      return NextResponse.json({ error: 'Delivery or pickup date is required' }, { status: 400 })
    }

    const deliverToDifferentAddress = Boolean(body.deliverToDifferentAddress)
    const deliveryAddress = String(body.deliveryAddress || '').trim()
    const deliveryAreaId = String(body.deliveryAreaId || '').trim() || null
    const recipientName = String(body.recipientName || '').trim()
    const recipientPhone = String(body.recipientPhone || '').trim()

    if (orderType === 'delivery') {
      if (!deliveryAddress || !deliveryAreaId) {
        return NextResponse.json({ error: 'Delivery area and address are required' }, { status: 400 })
      }
      if (deliverToDifferentAddress && (!recipientName || !recipientPhone)) {
        return NextResponse.json(
          { error: 'Recipient name and phone are required for a different delivery address' },
          { status: 400 },
        )
      }
    }

    const buyerName = customer.full_name.trim()
    const buyerPhone = customer.phone.trim()
    const buyerEmail =
      String(customer.email || '').trim().toLowerCase() ||
      `${buyerPhone.replace(/\D/g, '')}@boss.local`

    const customerRow = await findOrCreateCustomer(supabase, {
      full_name: buyerName,
      phone: buyerPhone,
      email: buyerEmail,
      customerId: body.customerId as string | undefined,
    })
    const customerId = customerRow.id

    const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0)
    const total = subtotal + deliveryFee
    const paymentIntentId = String(body.paymentIntentId || '').trim() || null

    if (paymentIntentId) {
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
      if (!amountsMatch(total, paymentIntent.amount)) {
        return NextResponse.json(
          { error: 'Authorized payment amount does not match order total' },
          { status: 400 },
        )
      }
    }

    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const orderNumber = `SS-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        status: 'pending',
        order_type: orderType,
        delivery_area_id: orderType === 'delivery' ? deliveryAreaId : null,
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        recipient_name:
          orderType === 'delivery' && deliverToDifferentAddress ? recipientName : null,
        recipient_phone:
          orderType === 'delivery' && deliverToDifferentAddress ? recipientPhone : null,
        delivery_date: normalizedDeliveryDate,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        order_notes: notes,
        stripe_payment_intent_id: paymentIntentId,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      if (paymentIntentId) {
        await stripe.paymentIntents.cancel(paymentIntentId).catch(() => undefined)
      }
      throw new Error(orderError?.message ?? 'Could not create order')
    }

    const { error: itemsError } = await supabase.from('order_items').insert(items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      selected_flavor: item.selected_flavor ?? null,
      selected_weight: item.selected_weight ?? null,
      selected_size: item.selected_size ?? null,
      unit_price: item.unit_price,
      line_total: item.line_total,
    })))
    if (itemsError) {
      if (paymentIntentId) {
        await stripe.paymentIntents.cancel(paymentIntentId).catch(() => undefined)
      }
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(itemsError.message)
    }

    if (paymentIntentId) {
      await stripe.paymentIntents.update(paymentIntentId, {
        description: `Smoked Style Order ${orderNumber}`,
        metadata: { orderNumber, orderId: order.id },
      })
    }

    try {
      await sendOrderConfirmation({
        order_number: orderNumber,
        order_type: orderType,
        delivery_address: body.deliveryAddress || null,
        delivery_date: normalizedDeliveryDate,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customers: { full_name: buyerName, phone: buyerPhone, email: buyerEmail },
        order_items: items,
      })
    } catch (emailError) {
      console.error('Boss order confirmation email failed', emailError)
    }

    await sendNewOrderPushNotification(buyerName, total, orderNumber)

    const savedAddresses = body.savedAddresses as CustomerSavedAddresses | undefined
    let updatedCustomer = customerRow
    if (savedAddresses) {
      const patch = customerPatchFromSavedAddresses(savedAddresses)
      const { data: savedCustomer } = await supabase
        .from('customers')
        .update(patch)
        .eq('id', customerId)
        .select(
          'id, full_name, email, phone, saved_address_1, saved_delivery_area_id_1, saved_address_1_label, saved_address_2, saved_delivery_area_id_2, saved_address_2_label',
        )
        .single()
      if (savedCustomer) updatedCustomer = savedCustomer
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      customerId: updatedCustomer.id,
      customer: updatedCustomer,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not create boss order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
