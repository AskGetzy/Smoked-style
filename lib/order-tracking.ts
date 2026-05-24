import { formatDeliveryDate } from '@/lib/dates'
import { phonesMatch } from '@/lib/phone'

export const ORDER_TRACKING_CONTACT_PHONE = '(718) 810-9472'
export const ORDER_TRACKING_CONTACT_EMAIL = 'Smokedstyle1@gmail.com'

const DEFAULT_APP_URL = 'https://smoked-style-getzys-projects.vercel.app'

export function getAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/$/, '')
}

export function getOrderTrackingUrl(orderNumber: string) {
  return `${getAppBaseUrl()}/order-status/${encodeURIComponent(orderNumber)}`
}

export type PublicOrderItem = {
  product_name: string
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
}

export type PublicOrderSummary = {
  order_number: string
  status: string
  delivery_date: string | null
  items_summary: string
}

export type PublicOrderDetail = {
  order_number: string
  status: string
  order_type: string
  delivery_date: string | null
  delivery_address: string | null
  delivery_area_name: string | null
  gift_message: string | null
  order_items: PublicOrderItem[]
}

export function formatItemLine(item: PublicOrderItem) {
  const options = [
    item.selected_flavor,
    item.selected_weight != null ? `${item.selected_weight} lb` : null,
    item.selected_size,
  ].filter(Boolean)

  const suffix = options.length > 0 ? ` (${options.join(', ')})` : ''
  const qty = Number(item.quantity)
  const qtyLabel = qty === 1 ? 'x1' : `x${qty}`
  return `${item.product_name} ${qtyLabel}${suffix}`
}

export function summarizeOrderItems(items: PublicOrderItem[]) {
  if (!items.length) return 'No items'
  return items.map(formatItemLine).join(', ')
}

export function formatPublicDeliveryDate(value: string | null | undefined) {
  return formatDeliveryDate(value) || 'To be confirmed'
}

export const TRACKING_STEPS = ['Pending', 'Approved', 'Out for Delivery', 'Delivered'] as const

export function trackingStepLabels(orderType: string) {
  if (orderType === 'pickup') {
    return ['Pending', 'Approved', 'Ready for Pickup', 'Delivered'] as const
  }
  return TRACKING_STEPS
}

export function trackingStepIndex(status: string, orderType: string): number {
  switch (status) {
    case 'pending':
    case 'payment_failed':
      return 0
    case 'approved':
      return 1
    case 'ready_for_pickup':
    case 'out_for_delivery':
      return 2
    case 'delivered':
      return 3
    case 'cancelled':
      return -1
    default:
      return 0
  }
}

export function isTerminalCancelled(status: string) {
  return status === 'cancelled'
}

export function matchOrdersByPhone<T extends { buyer_phone?: string | null }>(
  orders: T[],
  phoneDigits: string,
  limit = 5,
): T[] {
  return orders.filter(order => phonesMatch(order.buyer_phone, phoneDigits)).slice(0, limit)
}

export const PUBLIC_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  ready_for_pickup: 'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  payment_failed: 'bg-red-100 text-red-800',
}

export function publicStatusLabel(status: string, orderType?: string) {
  if (status === 'ready_for_pickup') return 'Ready for Pickup'
  if (status === 'out_for_delivery') return 'Out for Delivery'
  if (status === 'payment_failed') return 'Payment Failed'
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
