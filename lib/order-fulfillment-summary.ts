import { normalizeDeliveryDate } from '@/lib/dates'
import type { Order } from '@/types'

export type FulfillmentFilter =
  | { kind: 'pickup' }
  | { kind: 'delivery'; areaId: string; areaName: string }

export type DeliveryAreaRow = {
  areaId: string
  areaName: string
  count: number
}

export type FulfillmentSummary = {
  deliveryRows: DeliveryAreaRow[]
  totalDeliveries: number
  pickupCount: number
}

export function ordersForDeliveryDate(orders: Order[], date: string) {
  return orders.filter(order => normalizeDeliveryDate(order.delivery_date) === date)
}

export function buildFulfillmentSummary(orders: Order[]): FulfillmentSummary {
  const deliveryMap = new Map<string, DeliveryAreaRow>()

  let pickupCount = 0
  let totalDeliveries = 0

  for (const order of orders) {
    if (order.order_type === 'pickup') {
      pickupCount += 1
      continue
    }

    totalDeliveries += 1
    const areaId = order.delivery_area_id ?? 'unknown'
    const areaName = order.delivery_areas?.name?.trim() || 'No area'
    const existing = deliveryMap.get(areaId)

    if (existing) {
      existing.count += 1
    } else {
      deliveryMap.set(areaId, { areaId, areaName, count: 1 })
    }
  }

  const deliveryRows = Array.from(deliveryMap.values()).sort((a, b) =>
    a.areaName.localeCompare(b.areaName),
  )

  return { deliveryRows, totalDeliveries, pickupCount }
}

export function orderMatchesFulfillmentFilter(
  order: Order,
  filter: FulfillmentFilter | null,
): boolean {
  if (!filter) return true
  if (filter.kind === 'pickup') return order.order_type === 'pickup'
  if (order.order_type === 'pickup') return false
  return order.delivery_area_id === filter.areaId
}

export function fulfillmentFilterKey(filter: FulfillmentFilter | null): string | null {
  if (!filter) return null
  if (filter.kind === 'pickup') return 'pickup'
  return `delivery:${filter.areaId}`
}
