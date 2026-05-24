import type { Order } from '@/types'

type Props = {
  order: Pick<Order, 'order_type' | 'delivery_areas'>
}

export default function OrderFulfillmentBadge({ order }: Props) {
  const isPickup = order.order_type === 'pickup'

  if (isPickup) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
        🏪 Pickup
      </span>
    )
  }

  const areaName = order.delivery_areas?.name?.trim()
  if (!areaName) return null

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
      🚚 {areaName}
    </span>
  )
}
