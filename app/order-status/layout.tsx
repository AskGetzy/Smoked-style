import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Track Your Order — Smoked Style',
  description: 'Check your Smoked Style order status by phone or order number.',
}

export default function OrderStatusLayout({ children }: { children: React.ReactNode }) {
  return children
}
