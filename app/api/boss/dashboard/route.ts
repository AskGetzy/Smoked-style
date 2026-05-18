import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  const { supabase } = admin
  const [orders, lowStock] = await Promise.all([
    supabase.from('orders').select('status, total, created_at'),
    supabase.from('products').select('id').lte('stock_quantity', 5),
  ])

  if (orders.error) return NextResponse.json({ error: orders.error.message }, { status: 500 })
  if (lowStock.error) return NextResponse.json({ error: lowStock.error.message }, { status: 500 })

  return NextResponse.json({
    orders: orders.data ?? [],
    lowStockCount: lowStock.data?.length ?? 0,
  })
}
