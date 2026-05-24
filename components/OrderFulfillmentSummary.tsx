'use client'

import { formatDeliveryDate, todayLocal } from '@/lib/dates'
import {
  buildFulfillmentSummary,
  fulfillmentFilterKey,
  type FulfillmentFilter,
} from '@/lib/order-fulfillment-summary'
import type { Order } from '@/types'

type Props = {
  date: string
  onDateChange: (date: string) => void
  orders: Order[]
  loading?: boolean
  activeFilter: FulfillmentFilter | null
  onFilterChange: (filter: FulfillmentFilter | null) => void
  /** boss uses larger touch targets */
  variant?: 'admin' | 'boss'
}

function rowClass(isActive: boolean, variant: 'admin' | 'boss') {
  const base =
    variant === 'boss'
      ? 'flex w-full min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-left transition'
      : 'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition'
  if (isActive) {
    return `${base} bg-orange-100 ring-2 ring-orange-400`
  }
  return `${base} hover:bg-gray-50 active:bg-gray-100`
}

export default function OrderFulfillmentSummary({
  date,
  onDateChange,
  orders,
  loading = false,
  activeFilter,
  onFilterChange,
  variant = 'admin',
}: Props) {
  const summary = buildFulfillmentSummary(orders)
  const activeKey = fulfillmentFilterKey(activeFilter)
  const dateLabel = formatDeliveryDate(date, { weekday: 'short', month: 'short', day: 'numeric' })
  const isToday = date === todayLocal()

  const cardClass =
    variant === 'boss'
      ? 'rounded-3xl bg-white p-4 shadow-sm'
      : 'mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm'

  return (
    <section className={cardClass}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className={`font-bold text-gray-900 ${variant === 'boss' ? 'text-lg' : 'text-base'}`}
            style={variant === 'admin' ? { color: 'var(--navy)' } : undefined}
          >
            Deliveries &amp; pickups
          </h2>
          {dateLabel && (
            <p className="mt-0.5 text-sm text-gray-500">
              {isToday ? 'Today' : dateLabel}
              {isToday && dateLabel ? ` · ${dateLabel}` : ''}
            </p>
          )}
        </div>
        <label className="block text-sm font-semibold text-gray-600">
          <span className="sr-only">Delivery date</span>
          <input
            type="date"
            value={date}
            onChange={e => {
              onFilterChange(null)
              onDateChange(e.target.value)
            }}
            className={
              variant === 'boss'
                ? 'h-12 rounded-xl border border-gray-200 px-3 text-base focus:border-orange-400 focus:outline-none'
                : 'rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none'
            }
          />
        </label>
      </div>

      {activeFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">
            Filtering:{' '}
            <span className="font-semibold text-gray-900">
              {activeFilter.kind === 'pickup'
                ? 'Pickup'
                : activeFilter.areaName}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onFilterChange(null)}
            className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white hover:bg-orange-600"
          >
            Clear filter
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading summary…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                Deliveries
              </h3>
              <span className="text-sm font-bold text-blue-700">
                {summary.totalDeliveries} total
              </span>
            </div>
            {summary.deliveryRows.length === 0 ? (
              <p className="text-sm text-gray-400">No deliveries for this date.</p>
            ) : (
              <ul className="space-y-1">
                {summary.deliveryRows.map(row => {
                  const key = `delivery:${row.areaId}`
                  const isActive = activeKey === key
                  return (
                    <li key={row.areaId}>
                      <button
                        type="button"
                        onClick={() =>
                          onFilterChange(
                            isActive
                              ? null
                              : {
                                  kind: 'delivery',
                                  areaId: row.areaId,
                                  areaName: row.areaName,
                                },
                          )
                        }
                        className={rowClass(isActive, variant)}
                      >
                        <span className="font-semibold text-gray-900">
                          🚚 {row.areaName}
                        </span>
                        <span className="font-bold text-gray-700">
                          {row.count} {row.count === 1 ? 'order' : 'orders'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                Pickups
              </h3>
              <span className="text-sm font-bold text-green-700">
                {summary.pickupCount} total
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onFilterChange(activeKey === 'pickup' ? null : { kind: 'pickup' })
              }
              className={rowClass(activeKey === 'pickup', variant)}
            >
              <span className="font-semibold text-gray-900">🏪 Pickup</span>
              <span className="font-bold text-gray-700">
                {summary.pickupCount} {summary.pickupCount === 1 ? 'order' : 'orders'}
              </span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
