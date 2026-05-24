import { NextRequest, NextResponse } from 'next/server'
import { toPublicOrderDetail } from '@/lib/public-order-payload'
import { resolvePublicOrderByNumber } from '@/lib/resolve-public-order'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderNumber: string } },
) {
  const supabase = createServerClient()

  try {
    const order = await resolvePublicOrderByNumber(supabase, params.orderNumber)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        ...toPublicOrderDetail(order),
        fetched_at: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      },
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not load order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
