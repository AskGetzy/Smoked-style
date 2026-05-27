import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  const { supabase } = admin
  const [products, customers, areas] = await Promise.all([
    supabase.from('products').select('*').order('category'),
    supabase
      .from('customers')
      .select(
        'id, full_name, email, phone, saved_address_1, saved_delivery_area_id_1, saved_address_1_label, saved_address_2, saved_delivery_area_id_2, saved_address_2_label',
      )
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('delivery_areas').select('*').eq('is_active', true).order('name'),
  ])

  if (products.error) return NextResponse.json({ error: products.error.message }, { status: 500 })
  if (customers.error) return NextResponse.json({ error: customers.error.message }, { status: 500 })
  if (areas.error) return NextResponse.json({ error: areas.error.message }, { status: 500 })

  return NextResponse.json({
    products: products.data ?? [],
    customers: customers.data ?? [],
    deliveryAreas: areas.data ?? [],
  })
}
