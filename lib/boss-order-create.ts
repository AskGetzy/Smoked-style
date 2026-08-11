import type { SupabaseClient } from '@supabase/supabase-js'
import { amountsMatch } from '@/lib/checkout-pricing'
import { normalizeDeliveryDate } from '@/lib/dates'
import { sendOrderConfirmation } from '@/lib/email'
import { sendNewOrderPushNotification } from '@/lib/send-new-order-push'
import { generateOrderNumber } from '@/lib/order-number'
import {
  customerPatchFromSavedAddresses,
  type CustomerSavedAddresses,
} from '@/lib/customer-saved-addresses'
import { findOrCreateCustomer } from '@/lib/customers-server'
import { stripe } from '@/lib/stripe'

export type BossOrderCreateItem = {
  product_id: string
  product_name: string
  quantity: number
  selected_flavor?: string | null
  selected_weight?: number | null
  selected_size?: string | null
  unit_price: number
  line_total: number
}

export type BossOrderCreateInput = {
  customer: { full_name: string; phone: string; email?: string | null }
  customerId?: string
  items: BossOrderCreateItem[]
  orderType: 'pickup' | 'delivery'
  deliveryFee?: number
  deliveryDate: string
  notes?: string | null
  giftMessage?: string | null
  deliverToDifferentAddress?: boolean
  deliveryAddress?: string
  deliveryAreaId?: string
  recipientName?: string
  recipientPhone?: string
  paymentIntentId?: string | null
  savedAddresses?: CustomerSavedAddresses
  paymentType?: 'online' | 'invoice'
}

export type BossOrderCreateResult = {
  orderId: string
  orderNumber: string
  customerId: string
  customer: { id: string; full_name: string; email: string; phone: string | null }
}

/**
 * Shared order-creation logic used by both the single "New Order" flow and
 * the bulk upload importer. paymentIntentId is optional: when omitted the
 * order is created with no Stripe authorization at all (invoice / pay
 * later) — capture logic elsewhere already skips orders with no
 * stripe_payment_intent_id, so this "just works" without special-casing.
 */
export async function createBossOrder(
  supabase: SupabaseClient,
  input: BossOrderCreateInput,
): Promise<BossOrderCreateResult> {
  const { customer, items } = input
  const orderType = input.orderType === 'pickup' ? 'pickup' : 'delivery'
  const deliveryFee = Number(input.deliveryFee ?? 0)
  const normalizedDeliveryDate = normalizeDeliveryDate(String(input.deliveryDate || ''))
  const notes = String(input.notes || '').trim() || null
  const giftMessage = String(input.giftMessage || '').trim() || null

  if (!customer.full_name?.trim() || !customer.phone?.trim()) {
    throw new Error('Customer name and phone are required')
  }
  if (items.length === 0) {
    throw new Error('Add at least one item')
  }
  if (!normalizedDeliveryDate) {
    throw new Error('Delivery or pickup date is required')
  }

  const deliverToDifferentAddress = Boolean(input.deliverToDifferentAddress)
  const deliveryAddress = String(input.deliveryAddress || '').trim()
  const deliveryAreaId = String(input.deliveryAreaId || '').trim() || null
  const recipientName = String(input.recipientName || '').trim()
  const recipientPhone = String(input.recipientPhone || '').trim()

  if (orderType === 'delivery') {
    if (!deliveryAddress || !deliveryAreaId) {
      throw new Error('Delivery area and address are required')
    }
    if (deliverToDifferentAddress && (!recipientName || !recipientPhone)) {
      throw new Error('Recipient name and phone are required for a different delivery address')
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
    customerId: input.customerId,
  })
  const customerId = customerRow.id

  const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0)
  const total = subtotal + deliveryFee
  const paymentIntentId = String(input.paymentIntentId || '').trim() || null

  if (paymentIntentId) {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (existingOrder) {
      return {
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
        customerId,
        customer: customerRow,
      }
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (paymentIntent.status !== 'requires_capture') {
      throw new Error(`Payment was not authorized. Current status: ${paymentIntent.status}`)
    }
    if (!amountsMatch(total, paymentIntent.amount)) {
      throw new Error('Authorized payment amount does not match order total')
    }
  }

  const orderNumber = await generateOrderNumber(supabase)

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
      gift_message: giftMessage,
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
      delivery_address: orderType === 'delivery' ? deliveryAddress : null,
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

  let updatedCustomer = customerRow
  if (input.savedAddresses) {
    const patch = customerPatchFromSavedAddresses(input.savedAddresses)
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

  return {
    orderId: order.id,
    orderNumber,
    customerId: updatedCustomer.id,
    customer: updatedCustomer,
  }
}
