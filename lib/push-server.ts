import webpush from 'web-push'
import { createServerClient } from '@/lib/supabase-server'

let configured = false

function ensureVapidConfigured() {
  if (configured) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID keys')
  }

  webpush.setVapidDetails('mailto:Smokedstyle1@gmail.com', publicKey, privateKey)
  configured = true
}

export type PushMessage = {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPushNotifications(message: PushMessage) {
  ensureVapidConfigured()

  const supabase = createServerClient()
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (error) throw new Error(error.message)
  if (!subscriptions?.length) {
    return { sent: 0, removed: 0 }
  }

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url ?? '/boss/orders',
    tag: message.tag,
  })

  let sent = 0
  let removed = 0

  await Promise.all(
    subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        )
        sent += 1
      } catch (pushError: unknown) {
        const statusCode =
          typeof pushError === 'object' &&
          pushError !== null &&
          'statusCode' in pushError &&
          typeof (pushError as { statusCode?: number }).statusCode === 'number'
            ? (pushError as { statusCode: number }).statusCode
            : null

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
          removed += 1
        } else {
          console.error('Push send failed', pushError)
        }
      }
    }),
  )

  return { sent, removed }
}
