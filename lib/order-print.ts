import { buildBulkLabelsZpl, downloadTextFile, orderToZplOrder } from '@/lib/bulk-print'
import { openBulkPackingSlips } from '@/lib/packing-slip'
import type { Order } from '@/types'

export function downloadOrderLabel(order: Order) {
  const zpl = buildBulkLabelsZpl([order])
  const filename = `label-${order.order_number}.zpl`
  downloadTextFile(filename, zpl, 'application/octet-stream')
}

export function openOrderPackingSlip(order: Order) {
  openBulkPackingSlips([order])
}

export function orderSupportsLabelPrint(order: Pick<Order, 'status'>) {
  return order.status !== 'cancelled'
}
