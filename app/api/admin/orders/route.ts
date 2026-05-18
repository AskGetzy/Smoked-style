import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const authSupabase = createRouteHandlerClient({ cookies })
    const { data: sessionData, error: sessionError } = await authSupabase.auth.getSession()
    const session = sessionData.session

    if (sessionError || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', session.user.email)
      .maybeSingle()

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 })
    }

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden: user is not an admin' }, { status: 403 })
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
      .select('*, customers(full_name, email, phone), order_items(*)')
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
