'use client'

import { formatDeliveryDate } from '@/lib/dates'
import { displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'
import type { Order, OrderItem } from '@/types'

function formatItemLine(item: OrderItem) {
  const options = [
    item.selected_flavor,
    item.selected_weight != null ? `${item.selected_weight}lb` : null,
    item.selected_size,
  ].filter(Boolean)

  const suffix = options.length > 0 ? ` (${options.join(', ')})` : ''
  return `${item.product_name} ×${item.quantity}${suffix}`
}

type Props = {
  order: Order
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export default function BulkLabelPreviewCard({ order, checked, onCheckedChange }: Props) {
  const isPickup = order.order_type === 'pickup'
  const formattedDate = formatDeliveryDate(order.delivery_date, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const areaName = order.delivery_areas?.name ?? null
  const areaDateLine = isPickup
    ? formattedDate
    : [areaName, formattedDate].filter(Boolean).join(' · ')
  const items = order.order_items ?? []

  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm transition-opacity ${
        checked ? 'border-gray-900' : 'border-gray-200 opacity-55'
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheckedChange(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-orange-500"
          aria-label={`Include label for ${order.order_number}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-black tracking-wide" style={{ color: 'var(--navy)' }}>
            SMOKED STYLE
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">{order.order_number}</p>
        </div>
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded border-2 border-dashed border-gray-400 bg-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-500"
          aria-hidden
        >
          QR
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3 text-sm text-gray-800">
        <p className="font-semibold text-gray-900">{displayBuyerName(order)}</p>
        {displayBuyerPhone(order) && (
          <p className="text-gray-600">{displayBuyerPhone(order)}</p>
        )}

        {isPickup ? (
          <p className="text-3xl font-black uppercase tracking-wide text-orange-600">PICKUP</p>
        ) : (
          <p className="font-medium leading-snug text-gray-900">
            {order.delivery_address || 'Address TBD'}
          </p>
        )}

        {areaDateLine && <p className="text-gray-600">{areaDateLine}</p>}

        {items.length > 0 && (
          <ul className="space-y-1 border-t border-gray-100 pt-2">
            {items.map(item => (
              <li key={item.id} className="text-gray-800">
                {formatItemLine(item)}
              </li>
            ))}
          </ul>
        )}

        {order.gift_message && (
          <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-950">
            <span className="font-bold">Gift:</span> {order.gift_message}
          </p>
        )}

        {order.order_notes && (
          <p className="rounded-lg bg-gray-50 px-2 py-1.5 text-gray-800">
            <span className="font-bold">Note:</span> {order.order_notes}
          </p>
        )}
      </div>
    </div>
  )
}
