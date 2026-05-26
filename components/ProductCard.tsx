'use client'

import type { Product } from '@/types'
import ProductImage from '@/components/ProductImage'
import { formatPrice } from '@/lib/product-display'
import { ORDER_TRACKING_CONTACT_PHONE } from '@/lib/order-tracking'
import { isOutOfStock } from '@/lib/product-stock'

type Props = {
  product: Product
  onOpen: () => void
  onAdd: () => void
}

export default function ProductCard({ product, onOpen, onAdd }: Props) {
  const outOfStock = isOutOfStock(product)
  const inquiryOnly = Boolean(product.customer_inquiry_only)

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow sm:hover:-translate-y-0.5 sm:hover:shadow-lg ${
        outOfStock ? 'opacity-60 grayscale' : ''
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-0 flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        <div className="relative">
          <ProductImage product={product} className="h-48" rounded="top" />
          {outOfStock && (
            <div className="absolute left-3 top-3 rounded-full bg-gray-800 px-2.5 py-1 text-xs font-bold text-white">
              Out of Stock
            </div>
          )}
          {product.is_featured_purim && (
            <div className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
              Purim Special
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-bold leading-snug text-gray-900">
            {product.name}
          </h3>
          <div className="mt-auto pt-3">
            {inquiryOnly ? (
              <span className="text-sm font-bold uppercase tracking-wide text-amber-700">
                Call for inquiry
              </span>
            ) : (
              <span className="text-lg font-bold" style={{ color: 'var(--orange)' }}>
                {formatPrice(product)}
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="border-t border-gray-50 p-4 pt-0">
        {inquiryOnly ? (
          <a
            href="tel:7188109472"
            className="flex min-h-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            Call Inquiry: {ORDER_TRACKING_CONTACT_PHONE}
          </a>
        ) : outOfStock ? (
          <div className="flex min-h-12 items-center justify-center rounded-xl bg-gray-50 text-sm font-semibold text-gray-400">
            Unavailable
          </div>
        ) : (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onAdd()
            }}
            className="min-h-12 w-full rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: 'var(--navy)' }}
            onMouseOver={e => { e.currentTarget.style.background = '#243258' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--navy)' }}
          >
            Add to Cart
          </button>
        )}
      </div>
    </article>
  )
}
