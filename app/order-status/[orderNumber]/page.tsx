import Link from 'next/link'
import { notFound } from 'next/navigation'
import OrderStatusBar from '@/components/order-status/OrderStatusBar'
import { OrderStatusPageShell } from '@/components/order-status/OrderStatusShell'
import {
  formatItemLine,
  formatPublicDeliveryDate,
  type PublicOrderItem,
} from '@/lib/order-tracking'
import { createServerClient } from '@/lib/supabase-server'

type Props = {
  params: { orderNumber: string }
}

export default async function OrderStatusDetailPage({ params }: Props) {
  const orderNumber = decodeURIComponent(params.orderNumber)
  const supabase = createServerClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'order_number, status, order_type, delivery_date, delivery_address, gift_message, order_items(product_name, quantity, selected_flavor, selected_weight, selected_size), delivery_areas(name)',
    )
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error || !order) {
    notFound()
  }

  const items = (order.order_items ?? []) as PublicOrderItem[]
  const deliveryArea =
    (order.delivery_areas as { name?: string } | null)?.name ?? null
  const isPickup = order.order_type === 'pickup'

  return (
    <OrderStatusPageShell backHref="/order-status">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
          Order number
        </div>
        <h1 className="mb-6 text-center text-2xl font-black" style={{ color: 'var(--navy)' }}>
          {order.order_number}
        </h1>

        <div className="mb-8">
          <OrderStatusBar status={order.status} orderType={order.order_type} />
        </div>

        <div className="mb-6 rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between gap-4 border-b border-gray-200 py-2">
            <span className="text-gray-500">Delivery date</span>
            <span className="font-semibold text-gray-900">{formatPublicDeliveryDate(order.delivery_date)}</span>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <span className="text-gray-500">{isPickup ? 'Fulfillment' : 'Delivery area'}</span>
            <span className="text-right font-semibold text-gray-900">
              {isPickup ? 'Pickup' : deliveryArea || 'Delivery'}
            </span>
          </div>
          {!isPickup && order.delivery_address && (
            <div className="border-t border-gray-200 pt-2">
              <div className="text-gray-500">Address</div>
              <div className="mt-1 font-medium text-gray-900">{order.delivery_address}</div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Items</h2>
          <ul className="space-y-2">
            {items.length === 0 ? (
              <li className="text-sm text-gray-500">No items listed.</li>
            ) : (
              items.map((item, index) => (
                <li key={index} className="rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-800">
                  {formatItemLine(item)}
                </li>
              ))
            )}
          </ul>
        </div>

        {order.gift_message && (
          <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-800">Gift message</div>
            <p className="mt-1 text-sm text-amber-900">{order.gift_message}</p>
          </div>
        )}

        <Link
          href="/order-status"
          className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white"
          style={{ background: 'var(--navy)' }}
        >
          Look up another order
        </Link>
      </div>
    </OrderStatusPageShell>
  )
}
