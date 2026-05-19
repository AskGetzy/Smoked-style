'use client'

import Link from 'next/link'
import { formatDeliveryDate } from '@/lib/dates'
import type { ProductionOrderRow } from '@/lib/production-items'
import SlideOverPanel from '@/components/SlideOverPanel'

type ProductionOrdersPanelProps = {
  open: boolean
  productName: string
  rows: ProductionOrderRow[]
  loading?: boolean
  orderDetailBasePath: '/admin/orders' | '/boss/orders'
  onClose: () => void
}

function phoneLinks(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return { tel: `tel:${digits}`, whatsapp: `https://wa.me/${digits}` }
}

export default function ProductionOrdersPanel({
  open,
  productName,
  rows,
  loading = false,
  orderDetailBasePath,
  onClose,
}: ProductionOrdersPanelProps) {
  return (
    <SlideOverPanel
      open={open}
      title={productName}
      loading={loading}
      onClose={onClose}
    >
      {rows.length === 0 ? (
        <p className="text-base text-gray-500">No orders found for this item.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(row => {
            const links = row.phone ? phoneLinks(row.phone) : null
            return (
              <li key={row.orderId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <Link
                  href={`${orderDetailBasePath}/${row.orderId}`}
                  className="text-base font-black text-orange-600 underline-offset-2 hover:underline"
                >
                  {row.orderNumber}
                </Link>
                <div className="mt-2 text-base font-bold text-gray-900">{row.customerName}</div>
                {row.phone && links && (
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
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p><span className="font-semibold text-gray-800">Qty:</span> {row.quantity}</p>
                  <p><span className="font-semibold text-gray-800">Area:</span> {row.deliveryArea}</p>
                  <p><span className="font-semibold text-gray-800">Date:</span> {formatDeliveryDate(row.deliveryDate) || row.deliveryDate}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SlideOverPanel>
  )
}
