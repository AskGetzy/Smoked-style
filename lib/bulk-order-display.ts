import { normalizeDeliveryDate } from '@/lib/dates'
import type { BulkOrderRecipient, Order, OrderItem } from '@/types'

export type BulkAwareOrderType = 'all' | 'delivery' | 'pickup'

function recipientAreaName(recipient: BulkOrderRecipient) {
  return recipient.delivery_areas?.name ?? recipient.delivery_area ?? null
}

function recipientOrderItem(orderId: string, recipient: BulkOrderRecipient): OrderItem {
  const quantity = Number(recipient.quantity || 1)
  const unitPrice = Number(recipient.unit_price ?? 0)
  const lineTotal = Number(recipient.line_total ?? unitPrice * quantity)
  return {
    id: recipient.id,
    order_id: orderId,
    product_id: recipient.product_id ?? '',
    product_name: recipient.product_name || recipient.products?.name || 'Item',
    quantity,
    selected_flavor: recipient.flavor,
    selected_weight: recipient.weight,
    selected_size: recipient.size,
    unit_price: unitPrice,
    line_total: lineTotal,
  }
}

export function bulkOrderRecipients(order: Order) {
  return order.is_bulk_order ? order.bulk_order_recipients ?? [] : []
}

export function expandOrderForFulfillment(order: Order): Order[] {
  const recipients = bulkOrderRecipients(order)
  if (recipients.length === 0) return [order]

  return recipients.map(recipient => ({
    ...order,
    id: `${order.id}:${recipient.id}`,
    order_type: recipient.order_type,
    delivery_area_id: recipient.delivery_area_id,
    delivery_address: recipient.address,
    delivery_date: recipient.delivery_date,
    recipient_name: recipient.recipient_name,
    recipient_phone: recipient.recipient_phone,
    gift_message: recipient.gift_message,
    order_notes: recipient.notes,
    total: Number(recipient.line_total ?? 0),
    subtotal: Number(recipient.line_total ?? 0),
    delivery_fee: 0,
    order_items: [recipientOrderItem(order.id, recipient)],
    delivery_areas: recipientAreaName(recipient) ? { name: recipientAreaName(recipient)! } : null,
    bulk_order_recipients: undefined,
  }))
}

export function orderMatchesBulkFilters(
  order: Order,
  filters: {
    deliveryDate?: string | null
    deliveryAreaId?: string | null
    orderType?: BulkAwareOrderType
    statuses?: string[]
  },
) {
  if (filters.statuses?.length && !filters.statuses.includes(order.status)) return false

  const expanded = expandOrderForFulfillment(order)
  return expanded.some(stop => {
    if (filters.orderType && filters.orderType !== 'all' && stop.order_type !== filters.orderType) {
      return false
    }
    if (filters.deliveryDate && normalizeDeliveryDate(stop.delivery_date) !== filters.deliveryDate) {
      return false
    }
    if (filters.deliveryAreaId) {
      if (stop.order_type === 'pickup') return false
      if (stop.delivery_area_id !== filters.deliveryAreaId) return false
    }
    return true
  })
}
