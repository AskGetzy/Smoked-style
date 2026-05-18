import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = req.nextUrl.searchParams.get('id')

    if (orderId) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(*), order_items(*)')
        .eq('id', orderId)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }

      return NextResponse.json({ order: data })
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(full_name, email, phone)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data ?? [] })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not load orders'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
