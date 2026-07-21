'use client'

import { useState } from 'react'
import type { Product } from '@/types'
import ProductImage from '@/components/ProductImage'
import { formatPrice } from '@/lib/product-display'
import { ORDER_TRACKING_CONTACT_PHONE } from '@/lib/order-tracking'
import { isOutOfStock } from '@/lib/product-stock'

type Props = {
  product: Product
  priceLabel?: string
  onOpen: () => void
  onAdd: () => void
}

function unitTagLabel(product: Product): string {
  switch (product.sold_as) {
    case 'per_lb':
      return 'Per lb'
    case 'per_pack':
      return 'Per pack'
    case 'per_pan':
      return 'Per pan'
    case 'per_board':
      return 'Per board'
    default:
      return 'Per piece'
  }
}

function renderPriceDisplay(label: string, muted: boolean) {
  const match = label.match(/^(\$[\d.]+(?:-\$[\d.]+)?)(\/\w+)?$/)
  if (!match) {
    return (
      <span
        className="text-[18px] font-bold"
        style={{
          fontFamily: "'Work Sans', system-ui, sans-serif",
          color: muted ? 'var(--rustic-muted)' : 'var(--rustic-green-soft)',
        }}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className="text-[18px] font-bold"
      style={{
        fontFamily: "'Work Sans', system-ui, sans-serif",
        color: muted ? 'var(--rustic-muted)' : 'var(--rustic-green-soft)',
      }}
    >
      {match[1]}
      {match[2] && (
        <span
          className="text-[12.5px] font-medium"
          style={{ color: 'var(--rustic-muted)' }}
        >
          {match[2]}
        </span>
      )}
    </span>
  )
}

export default function ProductCard({ product, priceLabel, onOpen, onAdd }: Props) {
  const outOfStock = isOutOfStock(product)
  const inquiryOnly = Boolean(product.customer_inquiry_only)
  const [addedFlash, setAddedFlash] = useState(false)

  return (
    <article
      className="group flex h-full flex-col overflow-hidden transition-transform duration-[250ms] ease-in-out hover:-translate-y-[2px]"
      style={{
        borderRadius: '16px',
        background: 'var(--rustic-surface)',
        border: '1px solid var(--rustic-rule)',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-0 flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ ['--tw-ring-color' as string]: 'var(--rustic-navy)' }}
      >
        <div className="relative overflow-hidden">
          <ProductImage product={product} className="h-[230px]" outOfStock={outOfStock} />
          <div
            className="absolute left-3 top-3 text-[10.5px] font-semibold uppercase tracking-wide text-white"
            style={{
              background: outOfStock ? 'rgba(120,105,90,0.92)' : 'var(--rustic-badge-bg)',
              backdropFilter: 'blur(6px)',
              borderRadius: '9999px',
              padding: '5px 11px',
            }}
          >
            {outOfStock ? 'Out of Stock' : unitTagLabel(product)}
          </div>
          {product.is_featured_purim && (
            <div
              className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
            >
              Purim Special
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col" style={{ padding: '16px 16px 12px' }}>
          <h3
            className="line-clamp-2 min-h-[2.75rem] text-[18px] font-semibold leading-snug"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: outOfStock ? 'var(--rustic-muted)' : 'var(--rustic-smoke)',
            }}
          >
            {product.name}
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            {inquiryOnly ? (
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: 'var(--rustic-ember-dim)' }}
              >
                Call for inquiry
              </span>
            ) : (
              renderPriceDisplay(priceLabel ?? formatPrice(product), outOfStock)
            )}
          </div>
        </div>
      </button>

      <div style={{ padding: '0 16px 16px' }}>
        {inquiryOnly ? (
          <a
            href="tel:7188109472"
            className="flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors"
            style={{
              borderColor: 'var(--rustic-rule)',
              background: 'var(--rustic-green-pale)',
              color: 'var(--rustic-navy)',
            }}
          >
            Call Inquiry: {ORDER_TRACKING_CONTACT_PHONE}
          </a>
        ) : outOfStock ? (
          <div
            className="flex min-h-[42px] w-full cursor-not-allowed items-center justify-center rounded-full text-[13.5px] font-medium"
            style={{ background: 'var(--rustic-rule)', color: 'var(--rustic-muted)' }}
          >
            Out of Stock
          </div>
        ) : (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onAdd()
              setAddedFlash(true)
              window.setTimeout(() => setAddedFlash(false), 400)
            }}
            className="min-h-[42px] w-full rounded-full px-5 text-[13.5px] font-bold transition-colors duration-200"
            style={{
              background: addedFlash ? 'var(--rustic-navy)' : 'var(--rustic-ember)',
              color: addedFlash ? '#ffffff' : 'var(--rustic-navy)',
            }}
          >
            {addedFlash ? 'Added' : 'Add to Cart'}
          </button>
        )}
      </div>
    </article>
  )
}
