import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendPushNotifications } from '@/lib/push-server'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin.ok) return admin.response

    const body = await req.json()
    const title = String(body.title || '').trim()
    const messageBody = String(body.body || '').trim()
    const url = String(body.url || '/boss/orders').trim()
    const tag = body.tag ? String(body.tag).trim() : undefined

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const result = await sendPushNotifications({ title, body: messageBody, url, tag })
    return NextResponse.json({ ok: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not send push notifications'
    console.error('Push send route failed', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
