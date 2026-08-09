import { NextRequest, NextResponse } from 'next/server'
import { toPublicOrderDetail } from '@/lib/public-order-payload'
import { resolvePublicOrderByNumber } from '@/lib/resolve-public-order'
import { createServerClient } from '@/lib/supabase-server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  // Higher limit than other public routes: the tracking page polls this every 20s.
  if (!checkRateLimit(req, 'order-status-detail', { limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse()
  }

  const supabase = createServerClient()

  try {
    const { orderNumber } = await params
    const order = await resolvePublicOrderByNumber(supabase, orderNumber)

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
