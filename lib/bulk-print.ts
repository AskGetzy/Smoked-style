import { formatDeliveryDate, normalizeDeliveryDate } from '@/lib/dates'
import { displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'
import { buildOrderLabelZpl, type ZplOrder } from '@/lib/zpl'
import type { Order } from '@/types'

export type BulkPrintScope = 'date' | 'area' | 'both'

export type BulkPrintFilters = {
  scope: BulkPrintScope
  deliveryDate: string
  deliveryAreaId: string
  includePending: boolean
}

export type BulkPrintQuery = {
  delivery_date?: string
  delivery_area_id?: string
  statuses: string
}

export function bulkPrintStatuses(includePending: boolean) {
  return includePending ? 'approved,pending' : 'approved'
}

export function filtersToQuery(filters: BulkPrintFilters): BulkPrintQuery {
  const query: BulkPrintQuery = {
    statuses: bulkPrintStatuses(filters.includePending),
  }

  if (filters.scope === 'date' || filters.scope === 'both') {
    if (filters.deliveryDate) query.delivery_date = filters.deliveryDate
  }

  if (filters.scope === 'area' || filters.scope === 'both') {
    if (filters.deliveryAreaId) query.delivery_area_id = filters.deliveryAreaId
  }

  return query
}

export function buildBulkPrintSearchParams(filters: BulkPrintFilters) {
  const query = filtersToQuery(filters)
  const params = new URLSearchParams()
  params.set('statuses', query.statuses)
  if (query.delivery_date) params.set('delivery_date', query.delivery_date)
  if (query.delivery_area_id) params.set('delivery_area_id', query.delivery_area_id)
  return params
}

export function validateBulkPrintFilters(filters: BulkPrintFilters): string | null {
  if (filters.scope === 'date' || filters.scope === 'both') {
    if (!filters.deliveryDate) return 'Select a delivery date.'
  }
  if (filters.scope === 'area' || filters.scope === 'both') {
    if (!filters.deliveryAreaId) return 'Select a delivery area.'
  }
  return null
}

export function orderToZplOrder(order: Order): ZplOrder {
  return {
    order_number: order.order_number,
    buyer_name: displayBuyerName(order),
    buyer_phone: displayBuyerPhone(order),
    order_type: order.order_type,
    delivery_address: order.delivery_address,
    delivery_area_name: order.delivery_areas?.name ?? null,
    delivery_date: order.delivery_date,
    gift_message: order.gift_message,
    order_notes: order.order_notes,
    order_items: (order.order_items ?? []).map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      selected_flavor: item.selected_flavor,
      selected_weight: item.selected_weight,
      selected_size: item.selected_size,
    })),
  }
}

export function buildBulkLabelsZpl(orders: Order[]) {
  return orders.map(order => buildOrderLabelZpl(orderToZplOrder(order))).join('\x0C')
}

export function bulkLabelsFilename(
  filters: BulkPrintFilters,
  areaName: string | null,
) {
  const datePart =
    filters.scope === 'area'
      ? 'all-dates'
      : normalizeDeliveryDate(filters.deliveryDate) || 'all-dates'
  const areaPart =
    filters.scope === 'date'
      ? 'all-areas'
      : (areaName || 'all-areas')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'all-areas'
  return `labels-${datePart}-${areaPart}.zpl`
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function bulkPrintSummary(
  count: number,
  filters: BulkPrintFilters,
  areaName: string | null,
  kind: 'labels' | 'packing slips',
) {
  const parts: string[] = []
  if (filters.scope !== 'area' && filters.deliveryDate) {
    parts.push(formatDeliveryDate(filters.deliveryDate, { month: 'short', day: 'numeric' }) || filters.deliveryDate)
  }
  if (filters.scope !== 'date' && areaName) {
    parts.push(areaName)
  }
  const where = parts.length > 0 ? ` for ${parts.join(', ')}` : ''
  const labelWord =
    kind === 'labels'
      ? count === 1
        ? 'label'
        : 'labels'
      : count === 1
        ? 'packing slip'
        : 'packing slips'
  return `You are about to print ${count} ${labelWord}${where}.`
}
