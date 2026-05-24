import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  const { supabase } = admin

  const [customersResult, ordersResult] = await Promise.all([
    supabase.from('customers').select('*').order('created_at', { ascending: false }),
    supabase.from('orders').select('customer_id, total, status'),
  ])

  if (customersResult.error) {
    return NextResponse.json({ error: customersResult.error.message }, { status: 500 })
  }
  if (ordersResult.error) {
    return NextResponse.json({ error: ordersResult.error.message }, { status: 500 })
  }

  const stats = new Map<string, { order_count: number; total_spent: number }>()

  for (const order of ordersResult.data ?? []) {
    if (!order.customer_id) continue
    const current = stats.get(order.customer_id) ?? { order_count: 0, total_spent: 0 }
    current.order_count += 1
    if (order.status === 'delivered') {
      current.total_spent += Number(order.total) || 0
    }
    stats.set(order.customer_id, current)
  }

  const customers = (customersResult.data ?? []).map(customer => {
    const s = stats.get(customer.id) ?? { order_count: 0, total_spent: 0 }
    return {
      ...customer,
      order_count: s.order_count,
      total_spent: s.total_spent,
    }
  })

  return NextResponse.json({ customers })
}
