import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  const { supabase } = admin
  const [orders, lowStock] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, delivery_date, customers(full_name, phone)'),
    supabase
      .from('products')
      .select('id, name, stock_quantity, low_stock_threshold')
      .lte('stock_quantity', 5)
      .order('name'),
  ])

  if (orders.error) return NextResponse.json({ error: orders.error.message }, { status: 500 })
  if (lowStock.error) return NextResponse.json({ error: lowStock.error.message }, { status: 500 })

  return NextResponse.json({
    orders: orders.data ?? [],
    lowStockProducts: lowStock.data ?? [],
    lowStockCount: lowStock.data?.length ?? 0,
  })
}
