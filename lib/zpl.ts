import { formatDeliveryDate } from '@/lib/dates'
import { getOrderTrackingUrl } from '@/lib/order-tracking'

export type ZplOrderItem = {
  product_name: string
  quantity: number
  selected_flavor?: string | null
  selected_weight?: number | null
  selected_size?: string | null
}

export type ZplOrder = {
  order_number: string
  buyer_name?: string | null
  buyer_phone?: string | null
  order_type?: string | null
  delivery_address?: string | null
  delivery_area_name?: string | null
  delivery_date?: string | null
  gift_message?: string | null
  order_notes?: string | null
  driver_name?: string | null
  order_items?: ZplOrderItem[] | null
}

function zplEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
}

function itemLine(item: ZplOrderItem) {
  const options = [
    item.selected_flavor,
    item.selected_weight != null ? `${item.selected_weight}lb` : null,
    item.selected_size,
  ].filter(Boolean)

  const suffix = options.length > 0 ? ` (${options.join(', ')})` : ''
  return `${item.product_name} x${item.quantity}${suffix}`
}

/** Build Zebra ZPL for a 4x6 shipping label (203 dpi). */
export function buildOrderLabelZpl(order: ZplOrder): string {
  const isPickup = order.order_type === 'pickup'
  const addressLine = isPickup
    ? 'PICKUP'
    : zplEscape(order.delivery_address || 'Address TBD')
  const areaDate = [
    order.delivery_area_name,
    formatDeliveryDate(order.delivery_date, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  ]
    .filter(Boolean)
    .join(' · ')

  const itemLines = (order.order_items ?? []).slice(0, 8).map(itemLine)
  const trackingUrl = getOrderTrackingUrl(order.order_number)

  const lines: string[] = [
    '^XA',
    '^CI28',
    '^FO30,20^A0N,34,34^FDSMOKED STYLE^FS',
    `^FO30,62^A0N,26,26^FD${zplEscape(order.order_number)}^FS`,
    `^FO30,96^A0N,22,22^FD${zplEscape(order.buyer_name || 'Customer')}^FS`,
  ]

  if (order.buyer_phone) {
    lines.push(`^FO30,124^A0N,20,20^FD${zplEscape(order.buyer_phone)}^FS`)
  }

  let y = order.buyer_phone ? 154 : 128
  lines.push(`^FO30,${y}^A0N,18,18^FD${addressLine}^FS`)
  y += 26

  if (areaDate) {
    lines.push(`^FO30,${y}^A0N,18,18^FD${zplEscape(areaDate)}^FS`)
    y += 28
  }

  for (const line of itemLines) {
    lines.push(`^FO30,${y}^A0N,16,16^FD${zplEscape(line)}^FS`)
    y += 22
  }

  if (order.gift_message) {
    lines.push(`^FO30,${y}^A0N,15,15^FDGIFT: ${zplEscape(order.gift_message)}^FS`)
    y += 24
  }

  if (order.order_notes) {
    lines.push(`^FO30,${y}^A0N,15,15^FDNOTE: ${zplEscape(order.order_notes)}^FS`)
    y += 24
  }

  if (order.driver_name) {
    lines.push(`^FO30,${y}^A0N,15,15^FDDriver: ${zplEscape(order.driver_name)}^FS`)
  }

  // Large QR linking to public order status page (model 2, magnification 10).
  lines.push(`^FO420,520^BQN,2,10^FDQA,${zplEscape(trackingUrl)}^FS`)
  lines.push('^XZ')

  return lines.join('\n')
}
