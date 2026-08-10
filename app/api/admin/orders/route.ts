import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { orderMatchesBulkFilters } from '@/lib/bulk-order-display'
import { normalizeDeliveryDate } from '@/lib/dates'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const { supabase } = admin

    const orderId = req.nextUrl.searchParams.get('id')

    if (orderId) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(*), order_items(*), delivery_areas(name), bulk_order_recipients(*, products(name, size_label), delivery_areas(name))')
        .eq('id', orderId)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }

      return NextResponse.json({ order: data })
    }

    let query = supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*), delivery_areas(name), bulk_order_recipients(*, products(name, size_label), delivery_areas(name))')

    const deliveryDate = req.nextUrl.searchParams.get('delivery_date')
    const deliveryAreaId = req.nextUrl.searchParams.get('delivery_area_id')
    const statusesParam = req.nextUrl.searchParams.get('statuses')
    const orderType = req.nextUrl.searchParams.get('order_type') || 'all'

    const normalizedDeliveryDate = deliveryDate ? normalizeDeliveryDate(deliveryDate) : null
    const statuses = statusesParam?.split(',').map(s => s.trim()).filter(Boolean) ?? []

    const hasBulkPrintFilters = Boolean(
      normalizedDeliveryDate || deliveryAreaId || statusesParam,
    )

    // Unfiltered dashboard lists need newest orders first; a 500-row cap sorted by
    // earliest delivery_date was hiding recently created boss orders.
    if (hasBulkPrintFilters) {
      query = query
        .order('delivery_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(500)
    } else {
      query = query.order('created_at', { ascending: false }).limit(2000)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let orders = (data ?? []) as any[]

    if (normalizedDeliveryDate || deliveryAreaId || statuses.length > 0 || orderType !== 'all') {
      orders = orders.filter(order =>
        orderMatchesBulkFilters(order, {
          deliveryDate: normalizedDeliveryDate,
          deliveryAreaId,
          orderType: orderType as 'all' | 'delivery' | 'pickup',
          statuses,
        }),
      )
    }

    return NextResponse.json({ orders, count: orders.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not load orders'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
