'use client'

import Link from 'next/link'
import { formatDeliveryDate, formatOrderDate } from '@/lib/dates'
import { displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'

export type DashboardOrder = {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  delivery_date?: string | null
  buyer_name?: string | null
  buyer_phone?: string | null
  customers?: { full_name?: string | null; phone?: string | null } | null
}

type DashboardOrderListProps = {
  orders: DashboardOrder[]
  orderDetailBasePath?: string
  emptyMessage?: string
}

function phoneLinks(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return { tel: `tel:${digits}`, whatsapp: `https://wa.me/${digits}` }
}

export default function DashboardOrderList({
  orders,
  orderDetailBasePath = '/boss/orders',
  emptyMessage = 'No orders to show.',
}: DashboardOrderListProps) {
  if (orders.length === 0) {
    return <p className="text-base text-gray-500">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-3">
      {orders.map(order => {
        const phone = displayBuyerPhone(order)
        const links = phone ? phoneLinks(phone) : null
        return (
          <li key={order.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <Link
              href={`${orderDetailBasePath}/${order.id}`}
              className="text-base font-black text-orange-600 underline-offset-2 hover:underline"
            >
              {order.order_number}
            </Link>
            <div className="mt-1 text-base font-bold">{displayBuyerName(order)}</div>
            {phone && links && (
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={links.tel} className="min-h-10 rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700 ring-1 ring-gray-200">
                  Call
                </a>
                <a
                  href={links.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-10 rounded-xl bg-white px-3 py-2 text-sm font-bold text-green-700 ring-1 ring-gray-200"
                >
                  WhatsApp
                </a>
              </div>
            )}
            <div className="mt-2 flex justify-between text-sm text-gray-600">
              <span className="capitalize">{order.status.replace(/_/g, ' ')}</span>
              <span className="font-black text-gray-900">${Number(order.total).toFixed(2)}</span>
            </div>
            {order.created_at && (
              <p className="mt-1 text-sm text-gray-500">
                Ordered: {formatOrderDate(order.created_at)}
              </p>
            )}
            {order.delivery_date && (
              <p className="text-sm text-gray-500">
                Delivery: {formatDeliveryDate(order.delivery_date)}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
