'use client'

import type { Product } from '@/types'
import ProductImage from '@/components/ProductImage'
import { formatPrice } from '@/lib/product-display'
import { isOutOfStock } from '@/lib/product-stock'

type Props = {
  product: Product
  onOpen: () => void
  onAdd: () => void
}

export default function ProductCard({ product, onOpen, onAdd }: Props) {
  const outOfStock = isOutOfStock(product)
  const accentLabel =
    product.category === 'boards'
      ? product.size_label || 'Ready to serve'
      : product.sold_as === 'per_lb'
        ? 'Sold by the pound'
        : product.sold_as === 'per_pack'
          ? 'Sold by the pack'
          : product.sold_as === 'per_pan'
            ? 'Sold by the pan'
            : 'Butcher counter favorite'

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,250,242,0.98),rgba(249,240,227,0.94))] shadow-[0_18px_60px_rgba(54,34,19,0.10)] transition duration-300 sm:hover:-translate-y-1 sm:hover:shadow-[0_24px_70px_rgba(54,34,19,0.16)] ${
        outOfStock ? 'opacity-75 grayscale-[0.2]' : ''
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-0 flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        <div className="relative">
          <ProductImage product={product} className="h-56" rounded="top" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(26,18,12,0.45))]" />
          {outOfStock && (
            <div className="absolute left-4 top-4 rounded-full bg-stone-900/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
              Out of Stock
            </div>
          )}
          {product.is_featured_purim && (
            <div className="absolute right-4 top-4 rounded-full bg-[linear-gradient(135deg,#d4a84b,#b97b2d)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-md">
              Purim Special
            </div>
          )}
          <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
            {accentLabel}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">
            {product.category.replace('_', ' ')}
          </div>
          <h3 className="mt-3 line-clamp-2 min-h-[3.2rem] font-serif text-2xl font-bold leading-tight text-stone-900">
            {product.name}
          </h3>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-600">
            {product.description || 'Small-batch quality prepared with the same premium smokehouse standard.'}
          </p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-5">
            <span className="text-xl font-black" style={{ color: 'var(--orange)' }}>
              {formatPrice(product)}
            </span>
            <span className="text-sm font-semibold text-stone-500">
              Tap for details
            </span>
          </div>
        </div>
      </button>

      <div className="border-t border-stone-200/60 p-5 pt-0">
        {outOfStock ? (
          <div className="flex min-h-12 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100/80 text-sm font-semibold text-stone-500">
            Unavailable
          </div>
        ) : (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onAdd()
            }}
            className="min-h-12 w-full rounded-2xl border border-[#1f2c48] bg-[linear-gradient(135deg,#1a2744,#322116)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(27,18,13,0.18)] transition hover:brightness-110"
          >
            Add to Cart
          </button>
        )}
      </div>
    </article>
  )
}
