import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
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
        .select('*, customers(*), order_items(*), delivery_areas(name)')
        .eq('id', orderId)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }

      return NextResponse.json({ order: data })
    }

    let query = supabase
      .from('orders')
      .select('*, customers(full_name, email, phone), order_items(*), delivery_areas(name)')

    const deliveryDate = req.nextUrl.searchParams.get('delivery_date')
    const deliveryAreaId = req.nextUrl.searchParams.get('delivery_area_id')
    const statusesParam = req.nextUrl.searchParams.get('statuses')
    const orderType = req.nextUrl.searchParams.get('order_type') || 'all'

    const normalizedDeliveryDate = deliveryDate ? normalizeDeliveryDate(deliveryDate) : null
    if (normalizedDeliveryDate) {
      query = query.eq('delivery_date', normalizedDeliveryDate)
    }
    if (statusesParam) {
      const statuses = statusesParam.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length > 0) {
        query = query.in('status', statuses)
      }
    }

    if (orderType === 'pickup') {
      query = query.eq('order_type', 'pickup')
    } else if (orderType === 'delivery') {
      query = query.eq('order_type', 'delivery')
      if (deliveryAreaId) {
        query = query.eq('delivery_area_id', deliveryAreaId)
      }
    } else if (deliveryAreaId) {
      query = query.or(
        `and(order_type.eq.delivery,delivery_area_id.eq.${deliveryAreaId}),order_type.eq.pickup`,
      )
    }

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

    const orders = data ?? []
    console.log('[admin/orders] List query', {
      mode: hasBulkPrintFilters ? 'bulk-print' : 'dashboard',
      delivery_date: normalizedDeliveryDate,
      delivery_area_id: deliveryAreaId,
      statuses: statusesParam,
      order_type: orderType,
      count: orders.length,
      order_numbers: orders.map((o: { order_number: string }) => o.order_number),
    })

    return NextResponse.json({ orders, count: orders.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not load orders'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
