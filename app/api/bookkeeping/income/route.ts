import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/admin-auth'
import { inDateRange, monthKey, orderIncomeDate, parseDateRangeFromSearchParams, weekKey } from '@/lib/bookkeeping'

const INCOME_STATUSES = ['approved', 'ready_for_pickup', 'out_for_delivery', 'delivered']

export async function GET(req: NextRequest) {
  const owner = await requireOwner(req)
  if (!owner.ok) return owner.response

  const params = new URL(req.url).searchParams
  const range = parseDateRangeFromSearchParams(params)
  const areaFilter = params.get('area') || 'all'
  const categoryFilter = params.get('category') || 'all'

  const { supabase } = owner
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, total, status, created_at, delivery_date, buyer_name, delivery_area_id, delivery_areas(name), order_items(product_name, line_total, quantity, product_id, products(category))',
    )
    .in('status', INCOME_STATUSES)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = []
  const byCategory = new Map<string, number>()
  const byArea = new Map<string, number>()
  const byWeek = new Map<string, number>()
  const byMonth = new Map<string, number>()
  let total = 0

  for (const order of orders ?? []) {
    const date = orderIncomeDate(order)
    if (!inDateRange(date, range)) continue

    const areaName = (order.delivery_areas as { name?: string } | null)?.name ?? 'Pickup / No area'
    if (areaFilter !== 'all' && order.delivery_area_id !== areaFilter) continue

    const items = (order.order_items ?? []) as Array<{
      product_name: string
      line_total: number
      quantity: number
      products?: { category?: string } | null
    }>

    const filteredItems =
      categoryFilter === 'all'
        ? items
        : items.filter(item => item.products?.category === categoryFilter)

    if (categoryFilter !== 'all' && filteredItems.length === 0) continue

    const itemsTotal = filteredItems.reduce((s, i) => s + Number(i.line_total), 0)
    const orderTotal = categoryFilter === 'all' ? Number(order.total) : itemsTotal

    total += orderTotal

    rows.push({
      id: order.id,
      date,
      order_number: order.order_number,
      customer_name: order.buyer_name ?? '—',
      area: areaName,
      items: filteredItems.map(i => `${i.quantity}x ${i.product_name}`).join(', '),
      total: orderTotal,
    })

    for (const item of filteredItems) {
      const cat = item.products?.category ?? 'other'
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(item.line_total))
    }

    byArea.set(areaName, (byArea.get(areaName) ?? 0) + orderTotal)
    byWeek.set(weekKey(date), (byWeek.get(weekKey(date)) ?? 0) + orderTotal)
    byMonth.set(monthKey(date), (byMonth.get(monthKey(date)) ?? 0) + orderTotal)
  }

  const { data: areas } = await supabase
    .from('delivery_areas')
    .select('id, name')
    .order('name')

  return NextResponse.json({
    range,
    rows,
    total,
    byCategory: Object.fromEntries(byCategory),
    byArea: Object.fromEntries(byArea),
    byWeek: Object.fromEntries(byWeek),
    byMonth: Object.fromEntries(byMonth),
    areas: areas ?? [],
  })
}
