import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { bulkOrderTotal, type BulkOrderPaymentMethod, type BulkRecipientDraft, validateBulkRecipientRows } from '@/lib/bulk-order'
import { customerHasCardOnFile, firstCardOnFile, getCustomerPaymentProfile } from '@/lib/bulk-order-server'
import { findOrCreateCustomer } from '@/lib/customers-server'
import { sendBulkPaymentLinkEmail } from '@/lib/email'
import { generateOrderNumber } from '@/lib/order-number'
import { sendNewOrderPushNotification } from '@/lib/send-new-order-push'
import { stripe } from '@/lib/stripe'

function normalizeBuyerEmail(email: string, phone: string) {
  const trimmed = email.trim().toLowerCase()
  return trimmed || `${phone.replace(/\D/g, '')}@boss.local`
}

function looksLikeDeliverableEmail(email: string) {
  return Boolean(email) && !email.endsWith('.local')
}

function toRecipientDrafts(input: any[]): BulkRecipientDraft[] {
  return input.map((row, index) => ({
    rowNumber: Number(row.rowNumber) || index + 1,
    recipient_name: String(row.recipient_name ?? ''),
    recipient_phone: String(row.recipient_phone ?? ''),
    product_name: String(row.product_name ?? ''),
    flavor: String(row.flavor ?? ''),
    weight: String(row.weight ?? ''),
    size: String(row.size ?? ''),
    quantity: String(row.quantity ?? ''),
    order_type: String(row.order_type ?? ''),
    delivery_area: String(row.delivery_area ?? ''),
    address: String(row.address ?? ''),
    delivery_date: String(row.delivery_date ?? ''),
    notes: String(row.notes ?? ''),
    gift_message: String(row.gift_message ?? ''),
  }))
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const body = await req.json()
    const buyer = body.buyer ?? {}
    const paymentMethod = String(body.paymentMethod || '') as BulkOrderPaymentMethod
    const recipientsInput = Array.isArray(body.recipients) ? body.recipients : []

    if (!buyer.full_name?.trim() || !buyer.phone?.trim()) {
      return NextResponse.json({ error: 'Buyer name and phone are required' }, { status: 400 })
    }
    if (!['payment_link', 'cash', 'check', 'card_on_file'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Choose a payment method' }, { status: 400 })
    }
    if (recipientsInput.length === 0) {
      return NextResponse.json({ error: 'Add at least one valid recipient row' }, { status: 400 })
    }

    const { supabase } = admin
    const [{ data: products, error: productsError }, { data: areas, error: areasError }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('delivery_areas').select('*').eq('is_active', true),
    ])

    if (productsError) throw new Error(productsError.message)
    if (areasError) throw new Error(areasError.message)

    const validation = validateBulkRecipientRows(
      toRecipientDrafts(recipientsInput),
      products ?? [],
      areas ?? [],
    )

    if (validation.validRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipient rows to create', validationErrors: validation.errors },
        { status: 400 },
      )
    }
    if (validation.rows.some(row => row.skipped)) {
      return NextResponse.json(
        { error: 'Remove skipped recipient rows before creating the bulk order', validationErrors: validation.errors },
        { status: 400 },
      )
    }

    const buyerName = buyer.full_name.trim()
    const buyerPhone = buyer.phone.trim()
    const buyerEmail = normalizeBuyerEmail(String(buyer.email || ''), buyerPhone)

    if (paymentMethod === 'payment_link' && !looksLikeDeliverableEmail(buyerEmail)) {
      return NextResponse.json({ error: 'Buyer email is required to send a payment link' }, { status: 400 })
    }

    const customerRow = await findOrCreateCustomer(supabase, {
      full_name: buyerName,
      phone: buyerPhone,
      email: buyerEmail,
      customerId: typeof buyer.customerId === 'string' ? buyer.customerId : undefined,
    })

    const customerProfile = await getCustomerPaymentProfile(supabase, customerRow.id)
    const total = Number(bulkOrderTotal(validation.validRows).toFixed(2))
    const orderNumber = await generateOrderNumber(supabase)
    const parentOrderType = validation.validRows.some(row => row.order_type === 'delivery')
      ? 'delivery'
      : 'pickup'
    const sortedDates = validation.validRows.map(row => row.delivery_date).sort()
    const parentDeliveryDate = sortedDates[0] ?? null

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerRow.id,
        buyer_customer_id: customerRow.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        status: 'pending',
        order_type: parentOrderType,
        delivery_date: parentDeliveryDate,
        subtotal: total,
        delivery_fee: 0,
        total,
        is_bulk_order: true,
        bulk_total: total,
      })
      .select('id')
      .single()

    if (orderError || !order) throw new Error(orderError?.message ?? 'Could not create bulk order')

    const recipientRows = validation.validRows.map(row => ({
      order_id: order.id,
      recipient_name: row.recipient_name,
      recipient_phone: row.recipient_phone,
      product_id: row.product_id,
      product_name: row.product_name,
      flavor: row.flavor,
      weight: row.weight,
      size: row.size,
      unit_price: row.unit_price,
      quantity: row.quantity,
      order_type: row.order_type,
      delivery_area_id: row.delivery_area_id,
      delivery_area: row.delivery_area,
      address: row.address,
      delivery_date: row.delivery_date,
      notes: row.notes,
      gift_message: row.gift_message,
      line_total: row.line_total,
    }))

    const orderItems = validation.validRows.map(row => ({
      order_id: order.id,
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: row.quantity,
      selected_flavor: row.flavor,
      selected_weight: row.weight,
      selected_size: row.size,
      unit_price: row.unit_price,
      line_total: row.line_total,
    }))

    const { error: recipientsError } = await supabase.from('bulk_order_recipients').insert(recipientRows)
    if (recipientsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(recipientsError.message)
    }

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(itemsError.message)
    }

    let paymentLinkUrl: string | null = null
    let stripePaymentIntentId: string | null = null
    let bulkPaidAt: string | null = null

    try {
      if (paymentMethod === 'card_on_file') {
        if (!customerProfile?.stripe_customer_id || !(await customerHasCardOnFile(customerProfile.stripe_customer_id))) {
          throw new Error('Buyer does not have a saved card on file')
        }

        const paymentMethodOnFile = await firstCardOnFile(customerProfile.stripe_customer_id)
        if (!paymentMethodOnFile) throw new Error('Buyer does not have a saved card on file')

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100),
          currency: 'usd',
          customer: customerProfile.stripe_customer_id,
          payment_method: paymentMethodOnFile.id,
          confirm: true,
          off_session: true,
          description: `Smoked Style Bulk Order ${orderNumber}`,
          receipt_email: looksLikeDeliverableEmail(buyerEmail) ? buyerEmail : undefined,
          metadata: { orderId: order.id, orderNumber, bulkOrder: 'true' },
        })

        stripePaymentIntentId = paymentIntent.id
        bulkPaidAt = new Date().toISOString()
      }

      if (paymentMethod === 'payment_link') {
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          success_url: `${req.nextUrl.origin}/order-status/${orderNumber}`,
          cancel_url: `${req.nextUrl.origin}/order-status/${orderNumber}`,
          customer_email: buyerEmail,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: { name: `Bulk order ${orderNumber}` },
                unit_amount: Math.round(total * 100),
              },
              quantity: 1,
            },
          ],
          metadata: { orderId: order.id, orderNumber, bulkOrder: 'true' },
        })

        paymentLinkUrl = session.url ?? null
        if (!paymentLinkUrl) throw new Error('Stripe did not return a checkout link')
        try {
          await sendBulkPaymentLinkEmail({
            order_number: orderNumber,
            total,
            customerName: buyerName,
            email: buyerEmail,
            paymentUrl: paymentLinkUrl,
          })
        } catch (emailError) {
          console.error('[bulk-order] Payment link email failed', emailError)
        }
      }
    } catch (error) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw error
    }

    const { error: paymentUpdateError } = await supabase
      .from('orders')
      .update({
        bulk_payment_method: paymentMethod,
        bulk_paid_at: bulkPaidAt,
        bulk_payment_link_url: paymentLinkUrl,
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .eq('id', order.id)

    if (paymentUpdateError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(paymentUpdateError.message)
    }

    await sendNewOrderPushNotification(buyerName, total, orderNumber)

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      total,
      bulkPaidAt,
      paymentLinkUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create bulk order' },
      { status: 500 },
    )
  }
}
