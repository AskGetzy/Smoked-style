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
        className="text-[21px] font-semibold"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: muted ? '#C4B8A8' : 'var(--rustic-navy)',
        }}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className="text-[21px] font-semibold"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        color: muted ? '#C4B8A8' : 'var(--rustic-navy)',
      }}
    >
      {match[1]}
      {match[2] && (
        <span
          className="text-[12.5px] font-normal"
          style={{ color: '#A89880' }}
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
      className="group flex h-full flex-col overflow-hidden transition-all duration-[250ms] ease-in-out hover:-translate-y-[3px]"
      style={{
        borderRadius: '18px',
        background: 'var(--rustic-surface)',
        boxShadow: '0 2px 16px rgba(44,24,16,0.07)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(44,24,16,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 16px rgba(44,24,16,0.07)'
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-0 flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        <div className="relative overflow-hidden">
          <ProductImage product={product} className="h-[230px]" outOfStock={outOfStock} />
          <div
            className="absolute left-3 top-3 text-[10.5px] font-medium text-white"
            style={{
              background: outOfStock ? 'rgba(120,105,90,0.92)' : 'var(--rustic-badge-bg)',
              backdropFilter: 'blur(6px)',
              borderRadius: '11px',
              padding: '5px 11px',
            }}
          >
            {outOfStock ? 'Out of Stock' : unitTagLabel(product)}
          </div>
          {product.is_featured_purim && (
            <div className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
              Purim Special
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col" style={{ padding: '18px 18px 20px' }}>
          <h3
            className="line-clamp-2 min-h-[2.75rem] text-[19px] font-bold leading-snug"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: outOfStock ? '#A89880' : 'var(--rustic-smoke)',
            }}
          >
            {product.name}
          </h3>
          <div className="mt-auto pt-3">
            {inquiryOnly ? (
              <span className="text-sm font-bold uppercase tracking-wide text-amber-700">
                Call for inquiry
              </span>
            ) : (
              renderPriceDisplay(priceLabel ?? formatPrice(product), outOfStock)
            )}
          </div>
        </div>
      </button>

      <div style={{ padding: '0 18px 20px' }}>
        {inquiryOnly ? (
          <a
            href="tel:7188109472"
            className="flex min-h-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            Call Inquiry: {ORDER_TRACKING_CONTACT_PHONE}
          </a>
        ) : outOfStock ? (
          <div
            className="flex min-h-[42px] w-full cursor-not-allowed items-center justify-center rounded-[13px] text-[13.5px] font-medium"
            style={{ background: '#E8E0D4', color: '#A89880' }}
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
            className="min-h-[42px] w-full rounded-[13px] px-5 text-[13.5px] font-semibold text-white transition-colors duration-200"
            style={{
              background: addedFlash ? 'var(--rustic-ember)' : 'var(--rustic-navy)',
            }}
            onMouseOver={e => {
              if (!addedFlash) e.currentTarget.style.background = '#1a3260'
            }}
            onMouseOut={e => {
              if (!addedFlash) e.currentTarget.style.background = 'var(--rustic-navy)'
            }}
          >
            Add to Cart
          </button>
        )}
      </div>
    </article>
  )
}
