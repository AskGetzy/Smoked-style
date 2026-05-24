'use client'

import { useLanguage } from '@/lib/language-context'
import { downloadOrderLabel, openOrderPackingSlip, orderSupportsLabelPrint } from '@/lib/order-print'
import type { Order } from '@/types'

type Props = {
  order: Order
  className?: string
}

export default function OrderPrintActions({ order, className = '' }: Props) {
  const { t } = useLanguage()

  if (!orderSupportsLabelPrint(order)) return null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => downloadOrderLabel(order)}
        className="w-full rounded-xl border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-800 hover:border-orange-200"
      >
        {t.printLabel}
      </button>
      <button
        type="button"
        onClick={() => openOrderPackingSlip(order)}
        className="w-full rounded-xl border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-800 hover:border-orange-200"
      >
        {t.printPackingSlip}
      </button>
    </div>
  )
}
