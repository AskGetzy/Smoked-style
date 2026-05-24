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
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-gray-900">{order.order_number}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isPickup ? 'bg-orange-200 text-orange-900' : 'bg-blue-200 text-blue-900'
              }`}
            >
              {isPickup ? 'Pickup' : 'Delivery'}
            </span>
          </div>
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

        <div
          className={`rounded-lg border px-3 py-2.5 ${
            isPickup ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'
          }`}
        >
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              isPickup ? 'text-orange-800' : 'text-blue-800'
            }`}
          >
            {isPickup ? 'Pickup order' : 'Delivery order'}
          </p>

          {isPickup ? (
            <p className="mt-1 text-2xl font-black uppercase tracking-wide text-orange-600">
              PICKUP
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {areaName && (
                <p className="font-bold text-gray-900">
                  <span className="text-gray-600 font-semibold">Area: </span>
                  {areaName}
                </p>
              )}
              <p className="font-medium leading-snug text-gray-900">
                <span className="text-gray-600 font-semibold">Address: </span>
                {order.delivery_address || 'Address TBD'}
              </p>
            </div>
          )}
        </div>

        {formattedDate && (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-700">
              {isPickup ? 'Pickup date: ' : 'Delivery date: '}
            </span>
            {formattedDate}
          </p>
        )}

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
