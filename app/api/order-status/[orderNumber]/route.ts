import { NextRequest, NextResponse } from 'next/server'
import { type PublicOrderDetail, type PublicOrderItem } from '@/lib/order-tracking'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderNumber: string } },
) {
  const orderNumber = decodeURIComponent(params.orderNumber)
  const supabase = createServerClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'order_number, status, order_type, delivery_date, delivery_address, gift_message, order_items(product_name, quantity, selected_flavor, selected_weight, selected_size), delivery_areas(name)',
    )
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const items = (order.order_items ?? []) as PublicOrderItem[]
  const payload: PublicOrderDetail = {
    order_number: order.order_number,
    status: order.status,
    order_type: order.order_type,
    delivery_date: order.delivery_date,
    delivery_address: order.delivery_address,
    delivery_area_name:
      (order.delivery_areas as { name?: string } | null)?.name ?? null,
    gift_message: order.gift_message,
    order_items: items,
  }

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
