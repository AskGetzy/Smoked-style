import { formatDeliveryDate, normalizeDeliveryDate } from '@/lib/dates'
import { displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'
import { buildOrderLabelZpl, type ZplOrder } from '@/lib/zpl'
import type { Order } from '@/types'

export type BulkPrintScope = 'date' | 'area' | 'both'

export type BulkPrintOrderType = 'all' | 'delivery' | 'pickup'

export type BulkPrintFilters = {
  scope: BulkPrintScope
  deliveryDate: string
  deliveryAreaId: string
  includePending: boolean
  orderType: BulkPrintOrderType
}

export type BulkPrintQuery = {
  delivery_date?: string
  delivery_area_id?: string
  statuses: string
  order_type: BulkPrintOrderType
}

/** Statuses that should receive shipping/pickup labels when bulk printing. */
export const BULK_LABEL_PRINT_STATUSES = [
  'approved',
  'ready_for_pickup',
  'out_for_delivery',
] as const

export function bulkPrintStatuses(includePending: boolean) {
  const statuses: string[] = [...BULK_LABEL_PRINT_STATUSES]
  if (includePending) statuses.push('pending')
  return statuses.join(',')
}

export function filtersToQuery(filters: BulkPrintFilters): BulkPrintQuery {
  const query: BulkPrintQuery = {
    statuses: bulkPrintStatuses(filters.includePending),
    order_type: filters.orderType,
  }

  if (filters.scope === 'date' || filters.scope === 'both') {
    const normalizedDate = normalizeDeliveryDate(filters.deliveryDate)
    if (normalizedDate) query.delivery_date = normalizedDate
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
  params.set('order_type', query.order_type)
  if (query.delivery_date) params.set('delivery_date', query.delivery_date)
  if (query.delivery_area_id) params.set('delivery_area_id', query.delivery_area_id)
  return params
}

export function validateBulkPrintFilters(filters: BulkPrintFilters): string | null {
  if (filters.orderType === 'pickup' && filters.scope === 'area') {
    return 'Pickup orders must be filtered by date.'
  }

  if (filters.scope === 'date' || filters.scope === 'both') {
    if (!filters.deliveryDate) return 'Select a delivery date.'
  }

  const needsArea =
    filters.orderType !== 'pickup' &&
    (filters.scope === 'area' || filters.scope === 'both')

  if (needsArea && !filters.deliveryAreaId) {
    return 'Select a delivery area.'
  }

  return null
}

export function bulkPrintOrderTypeLabel(orderType: BulkPrintOrderType) {
  if (orderType === 'delivery') return 'delivery only'
  if (orderType === 'pickup') return 'pickup only'
  return 'delivery + pickup'
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
  const labelBlocks = orders.map(order => buildOrderLabelZpl(orderToZplOrder(order)))
  console.log('[bulk-print] Generating ZPL labels', {
    orderCount: orders.length,
    labelBlockCount: labelBlocks.length,
    orderNumbers: orders.map(o => o.order_number),
  })
  // Each block is already ^XA … ^XZ; separate with newlines for multi-label .zpl files.
  return labelBlocks.join('\n')
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
  const typePart = filters.orderType === 'all' ? 'all-types' : filters.orderType
  return `labels-${datePart}-${areaPart}-${typePart}.zpl`
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

/** e.g. "Previewing 12 labels for May 26 — Williamsburg" */
export function bulkPrintPreviewHeading(
  count: number,
  filters: BulkPrintFilters,
  areaName: string | null,
) {
  const parts: string[] = []
  if (filters.scope !== 'area' && filters.deliveryDate) {
    parts.push(
      formatDeliveryDate(filters.deliveryDate, { month: 'short', day: 'numeric' }) ||
        filters.deliveryDate,
    )
  }
  if (filters.scope !== 'date' && areaName && filters.orderType !== 'pickup') {
    parts.push(areaName)
  }
  const where = parts.length > 0 ? ` for ${parts.join(' — ')}` : ''
  const labelWord = count === 1 ? 'label' : 'labels'
  return `Previewing ${count} ${labelWord}${where}`
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
  if (filters.scope !== 'date' && areaName && filters.orderType !== 'pickup') {
    parts.push(areaName)
  }
  parts.push(bulkPrintOrderTypeLabel(filters.orderType))
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
