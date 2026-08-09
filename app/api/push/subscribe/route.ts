import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  if (!checkRateLimit(req, 'push-subscribe', { limit: 5, windowMs: 60_000 })) {
    return rateLimitResponse()
  }

  try {
    const body = await req.json()
    const endpoint = String(body.endpoint || '').trim()
    const p256dh = String(body.p256dh || '').trim()
    const auth = String(body.auth || '').trim()
    const userEmail = String(body.userEmail || '').trim() || null

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { endpoint, p256dh, auth, user_email: userEmail },
        { onConflict: 'endpoint' },
      )

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not save subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
