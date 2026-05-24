import { NextRequest, NextResponse } from 'next/server'
import { matchOrdersByPhone, summarizeOrderItems, type PublicOrderItem } from '@/lib/order-tracking'
import { normalizePhoneDigits } from '@/lib/phone'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  let body: { phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const digits = normalizePhoneDigits(body.phone)
  if (digits.length < 7) {
    return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      'order_number, status, delivery_date, created_at, buyer_phone, order_items(product_name, quantity, selected_flavor, selected_weight, selected_size)',
    )
    .order('created_at', { ascending: false })
    .limit(400)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const matched = matchOrdersByPhone(data ?? [], digits, 5).map(order => {
    const items = (order.order_items ?? []) as PublicOrderItem[]
    return {
      order_number: order.order_number,
      status: order.status,
      delivery_date: order.delivery_date,
      items_summary: summarizeOrderItems(items),
    }
  })

  return NextResponse.json({ orders: matched })
}
