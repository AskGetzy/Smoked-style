import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { toCents } from '@/lib/checkout-pricing'
import { sendOrderUpdate } from '@/lib/email'
import { requireAdmin } from '@/lib/admin-auth'

type EditableItem = {
  id: string
  quantity: number
  unit_price: number
}

type NewOrderItem = {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  selected_flavor?: string | null
  selected_weight?: number | null
  selected_size?: string | null
}

function currency(value: number) {
  return `$${value.toFixed(2)}`
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { supabase } = admin
    const body = await req.json()
    const orderId = String(body.orderId || '')
    const items = (Array.isArray(body.items) ? body.items : []) as EditableItem[]
    const newItems = (Array.isArray(body.newItems) ? body.newItems : []) as NewOrderItem[]
    const deliveryFee = Number(body.deliveryFee ?? 0)
    const customAdjustment = Number(body.customAdjustment ?? 0)
    const customAdjustmentNote = String(body.customAdjustmentNote || '').trim() || null

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      return NextResponse.json({ error: 'Delivery fee must be 0 or greater' }, { status: 400 })
    }

    if (!Number.isFinite(customAdjustment)) {
      return NextResponse.json({ error: 'Adjustment must be a valid number' }, { status: 400 })
    }

    if (items.length === 0 && newItems.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    for (const item of newItems) {
      if (!item.product_id || !item.product_name?.trim()) {
        return NextResponse.json({ error: 'New items require a product' }, { status: 400 })
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: 'New item quantities must be greater than 0' }, { status: 400 })
      }
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
        return NextResponse.json({ error: 'New item prices must be 0 or greater' }, { status: 400 })
      }
    }

    for (const item of items) {
      if (!item.id || !Number.isFinite(item.quantity) || item.quantity < 0) {
        return NextResponse.json({ error: 'Item quantities must be 0 or greater' }, { status: 400 })
      }
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
        return NextResponse.json({ error: 'Item prices must be 0 or greater' }, { status: 400 })
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be edited' }, { status: 400 })
    }

    const existingItems = order.order_items ?? []
    const existingById = new Map(existingItems.map((item: any) => [item.id, item]))
    const keptItems = items.filter((item) => item.quantity > 0)

    if (keptItems.length === 0 && newItems.length === 0) {
      return NextResponse.json({ error: 'An order must have at least one item' }, { status: 400 })
    }

    for (const item of items) {
      if (!existingById.has(item.id)) {
        return NextResponse.json({ error: 'Invalid order item' }, { status: 400 })
      }
    }

    const newItemsSubtotal = newItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    )
    const subtotal =
      keptItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) + newItemsSubtotal
    const total = subtotal + deliveryFee + customAdjustment

    if (total < 0) {
      return NextResponse.json({ error: 'Order total cannot be negative' }, { status: 400 })
    }

    if (order.stripe_payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
      if (toCents(total) > paymentIntent.amount) {
        return NextResponse.json(
          { error: `The edited total ${currency(total)} is higher than the authorized amount ${currency(paymentIntent.amount / 100)}. Create a new order or re-authorize the card for the higher total.` },
          { status: 400 },
        )
      }
    }

    const changes: string[] = []
    for (const item of items) {
      const existing = existingById.get(item.id) as any
      const nextLineTotal = item.quantity * item.unit_price

      if (item.quantity === 0) {
        changes.push(`Removed ${existing.product_name}`)
        const { error } = await supabase.from('order_items').delete().eq('id', item.id)
        if (error) throw new Error(error.message)
        continue
      }

      if (Number(existing.quantity) !== item.quantity || Number(existing.unit_price) !== item.unit_price) {
        changes.push(`${existing.product_name}: quantity ${existing.quantity} to ${item.quantity}, unit price ${currency(item.unit_price)}`)
      }

      const { error } = await supabase
        .from('order_items')
        .update({
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: nextLineTotal,
        })
        .eq('id', item.id)

      if (error) throw new Error(error.message)
    }

    for (const item of newItems) {
      const lineTotal = item.quantity * item.unit_price
      changes.push(`Added ${item.product_name} (qty ${item.quantity})`)
      const { error } = await supabase.from('order_items').insert({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name.trim(),
        quantity: item.quantity,
        selected_flavor: item.selected_flavor ?? null,
        selected_weight: item.selected_weight ?? null,
        selected_size: item.selected_size ?? null,
        unit_price: item.unit_price,
        line_total: lineTotal,
      })
      if (error) throw new Error(error.message)
    }

    if (Number(order.delivery_fee) !== deliveryFee) {
      changes.push(`Delivery fee changed from ${currency(Number(order.delivery_fee))} to ${currency(deliveryFee)}`)
    }
    if (Number(order.custom_adjustment) !== customAdjustment) {
      changes.push(`Adjustment changed from ${currency(Number(order.custom_adjustment))} to ${currency(customAdjustment)}`)
    }
    if ((order.custom_adjustment_note ?? '') !== (customAdjustmentNote ?? '')) {
      changes.push('Adjustment note updated')
    }
    if (Number(order.total) !== total) {
      changes.push(`Order total changed from ${currency(Number(order.total))} to ${currency(total)}`)
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        subtotal,
        delivery_fee: deliveryFee,
        custom_adjustment: customAdjustment,
        custom_adjustment_note: customAdjustmentNote,
        total,
      })
      .eq('id', orderId)

    if (updateError) throw new Error(updateError.message)

    const { data: updatedOrder, error: updatedError } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*)')
      .eq('id', orderId)
      .single()

    if (updatedError || !updatedOrder) {
      throw new Error(updatedError?.message ?? 'Could not reload updated order')
    }

    if (changes.length > 0) {
      try {
        console.log('[email] About to send order update', {
          orderId,
          orderNumber: updatedOrder.order_number,
          changeCount: changes.length,
        })
        await sendOrderUpdate(updatedOrder, changes)
        console.log('[email] Finished sending order update', {
          orderId,
          orderNumber: updatedOrder.order_number,
        })
      } catch (emailError) {
        console.error('Order update email failed', emailError)
      }
    }

    return NextResponse.json({ order: updatedOrder, changes })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not update order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
