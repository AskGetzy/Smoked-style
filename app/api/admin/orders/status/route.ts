import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  approved: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
}

async function requireAdmin() {
  const authSupabase = createRouteHandlerClient({ cookies })
  const { data: sessionData, error: sessionError } = await authSupabase.auth.getSession()
  const email = sessionData.session?.user?.email

  if (sessionError || !email) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createServerClient()
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (adminError) {
    return { ok: false as const, response: NextResponse.json({ error: adminError.message }, { status: 500 }) }
  }

  if (!adminUser) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, supabase }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) return admin.response

    const { orderId, status } = await req.json()
    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing order ID or status' }, { status: 400 })
    }

    const { supabase } = admin
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot change order from ${order.status} to ${status}` },
        { status: 400 },
      )
    }

    const update: Record<string, string> = { status }
    if (status === 'delivered') {
      update.delivered_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(update)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not update order status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
