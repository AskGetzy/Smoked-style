import type { Order } from '@/types'

export type FulfillmentStatus =
  | 'approved'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'

/** One step back in the fulfillment flow (payment stays captured). */
export function getRevertStatus(
  status: Order['status'],
  orderType: Order['order_type'],
): Order['status'] | null {
  switch (status) {
    case 'delivered':
      return orderType === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery'
    case 'out_for_delivery':
    case 'ready_for_pickup':
      return 'approved'
    default:
      return null
  }
}

/** Manual status targets from the order detail screen (approve/reject stay separate). */
export function getSettableStatuses(
  status: Order['status'],
  orderType: Order['order_type'],
): FulfillmentStatus[] {
  const pickup = orderType === 'pickup'
  switch (status) {
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

export function canSetOrderStatus(
  from: Order['status'],
  to: Order['status'],
  orderType: Order['order_type'],
): boolean {
  if (from === to) return true
  return getSettableStatuses(from, orderType).includes(to as FulfillmentStatus)
}

export function statusRequiresPickupOnly(status: Order['status']): boolean {
  return status === 'ready_for_pickup'
}
