export async function sendNewOrderPushNotification(customerName: string, total: number) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🚨 New Order — Smoked Style',
        body: `${customerName} — $${total.toFixed(2)}`,
        url: '/boss/orders',
      }),
    })
  } catch (error) {
    console.error('Push notification failed:', error)
  }
}
