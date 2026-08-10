import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  const { supabase } = admin
  const productId = req.nextUrl.searchParams.get('productId')

  let query = supabase
    .from('stock_history')
    .select('id, product_id, change_amount, previous_quantity, new_quantity, reason, created_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ history: data ?? [] })
}
