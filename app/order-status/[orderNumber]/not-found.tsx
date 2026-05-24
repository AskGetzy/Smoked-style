import Link from 'next/link'
import { OrderStatusPageShell } from '@/components/order-status/OrderStatusShell'

export default function OrderStatusNotFound() {
  return (
    <OrderStatusPageShell backHref="/order-status">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-black" style={{ color: 'var(--navy)' }}>
          Order not found
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          We could not find an order with that number. Check the label or search by phone.
        </p>
        <Link
          href="/order-status"
          className="mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold text-white"
          style={{ background: 'var(--navy)' }}
        >
          Find by phone
        </Link>
      </div>
    </OrderStatusPageShell>
  )
}
