import type { Order } from '@/types'

export type FulfillmentStatus =
  | 'approved'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'

type OrderStatusContext = Pick<Order, 'status' | 'order_type' | 'approved_at'>

/** One step back in the fulfillment flow, or restore a cancelled order. */
export function getRevertStatus(order: OrderStatusContext): Order['status'] | null {
  const { status, order_type, approved_at } = order

  switch (status) {
    case 'delivered':
      return order_type === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery'
    case 'out_for_delivery':
    case 'ready_for_pickup':
      return 'approved'
    case 'cancelled':
      return approved_at ? 'approved' : 'pending'
    default:
      return null
  }
}

/** Manual status targets from the order detail screen (approve/reject stay separate). */
export function getSettableStatuses(order: OrderStatusContext): Order['status'][] {
  const { status, order_type, approved_at } = order
  const pickup = order_type === 'pickup'

  switch (status) {
    case 'cancelled':
      return approved_at ? ['approved', 'pending'] : ['pending']
    case 'approved':
      return pickup ? ['ready_for_pickup', 'delivered'] : ['out_for_delivery', 'delivered']
    case 'ready_for_pickup':
      return ['approved', 'delivered']
    case 'out_for_delivery':
      return ['approved', 'delivered']
    case 'delivered':
      return pickup ? ['approved', 'ready_for_pickup'] : ['approved', 'out_for_delivery']
    default:
      return []
  }
}

export function canSetOrderStatus(order: OrderStatusContext, to: Order['status']): boolean {
  if (order.status === to) return true

  if (order.status === 'cancelled') {
    if (to === 'pending') return !order.approved_at
    if (to === 'approved') return Boolean(order.approved_at)
    return false
  }

  return getSettableStatuses(order).includes(to)
}

export function statusRequiresPickupOnly(status: Order['status']): boolean {
  return status === 'ready_for_pickup'
}
