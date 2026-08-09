import { sendPushNotifications } from '@/lib/push-server'

export async function sendNewOrderPushNotification(
  customerName: string,
  total: number,
  orderNumber?: string,
) {
  try {
    await sendPushNotifications({
      title: '🚨 New Order — Smoked Style',
      body: orderNumber
        ? `${orderNumber} — ${customerName} — $${total.toFixed(2)}`
        : `${customerName} — $${total.toFixed(2)}`,
      url: '/boss/orders',
      tag: orderNumber ? `order-${orderNumber}` : undefined,
    })
  } catch (error) {
    console.error('Push notification failed:', error)
  }
}
