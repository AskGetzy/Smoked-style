import { NextRequest, NextResponse } from 'next/server'
import { findOrdersByPhone } from '@/lib/order-status-lookup'
import { normalizePhoneDigits } from '@/lib/phone'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const digits = normalizePhoneDigits(body.phone)
  if (digits.length < 7) {
    return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    const matched = await findOrdersByPhone(supabase, body.phone ?? '', 5)

    return NextResponse.json(
      { orders: matched },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not search orders'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
