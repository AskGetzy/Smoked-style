import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendOrderConfirmation } from '@/lib/email'

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
    const deliveryDate = String(body.deliveryDate || '')
    const notes = String(body.notes || '').trim() || null

    if (!customer.full_name?.trim() || !customer.phone?.trim()) {
      return NextResponse.json({ error: 'Customer name and phone are required' }, { status: 400 })
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Add at least one item' }, { status: 400 })
    }
    if (!deliveryDate) {
      return NextResponse.json({ error: 'Delivery or pickup date is required' }, { status: 400 })
    }

    let customerId = body.customerId as string | undefined
    const email = String(customer.email || '').trim().toLowerCase() || `${String(customer.phone).replace(/\D/g, '')}@boss.local`
    if (customerId) {
      await supabase
        .from('customers')
        .update({ full_name: customer.full_name.trim(), phone: customer.phone.trim(), email })
        .eq('id', customerId)
    } else {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customer.phone.trim())
        .maybeSingle()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: created, error: customerError } = await supabase
          .from('customers')
          .insert({ full_name: customer.full_name.trim(), phone: customer.phone.trim(), email })
          .select('id')
          .single()
        if (customerError || !created) throw new Error(customerError?.message ?? 'Could not create customer')
        customerId = created.id
      }
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0)
    const total = subtotal + deliveryFee
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const orderNumber = `SS-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        status: 'pending',
        order_type: orderType,
        delivery_area_id: body.deliveryAreaId || null,
        delivery_address: orderType === 'delivery' ? String(body.deliveryAddress || '').trim() || null : null,
        delivery_date: deliveryDate,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        order_notes: notes,
      })
      .select('id')
      .single()

    if (orderError || !order) throw new Error(orderError?.message ?? 'Could not create order')

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
    if (itemsError) throw new Error(itemsError.message)

    try {
      await sendOrderConfirmation({
        order_number: orderNumber,
        order_type: orderType,
        delivery_address: body.deliveryAddress || null,
        delivery_date: deliveryDate,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customers: { full_name: customer.full_name, phone: customer.phone, email },
        order_items: items,
      })
    } catch (emailError) {
      console.error('Boss order confirmation email failed', emailError)
    }

    return NextResponse.json({ orderId: order.id, orderNumber })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not create boss order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
