import type { PublicOrderDetail, PublicOrderItem } from '@/lib/order-tracking'
import type { PublicOrderRow } from '@/lib/resolve-public-order'

export function toPublicOrderDetail(order: PublicOrderRow): PublicOrderDetail {
  const items = (order.order_items ?? []) as PublicOrderItem[]
  return {
    order_number: order.order_number,
    status: order.status,
    order_type: order.order_type,
    delivery_date: order.delivery_date,
    delivery_address: order.delivery_address,
    delivery_area_name: order.delivery_areas?.name ?? null,
    gift_message: order.gift_message,
    order_items: items,
  }
}
