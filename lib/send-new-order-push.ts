export async function sendNewOrderPushNotification(
  customerName: string,
  total: number,
  orderNumber?: string,
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🚨 New Order — Smoked Style',
        body: orderNumber
          ? `${orderNumber} — ${customerName} — $${total.toFixed(2)}`
          : `${customerName} — $${total.toFixed(2)}`,
        url: '/boss/orders',
        tag: orderNumber ? `order-${orderNumber}` : undefined,
      }),
    })
  } catch (error) {
    console.error('Push notification failed:', error)
  }
}
