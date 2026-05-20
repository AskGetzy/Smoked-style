'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Product, CartItem } from '@/types'
import ProductImage from '@/components/ProductImage'
import { categoryLabel, formatPrice } from '@/lib/product-display'

interface Props {
  product: Product
  sizeVariants?: Product[]
  onClose: () => void
  onAdd: (item: CartItem) => void
}

export default function ProductModal({ product: initialProduct, sizeVariants = [], onClose, onAdd }: Props) {
  const variants = sizeVariants.length > 1 ? sizeVariants : [initialProduct]
  const [activeProduct, setActiveProduct] = useState(initialProduct)
  const [flavor, setFlavor] = useState(initialProduct.flavors?.[0] ?? null)
  const [weight, setWeight] = useState(initialProduct.weight_options?.[0] ?? null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setActiveProduct(initialProduct)
    setFlavor(initialProduct.flavors?.[0] ?? null)
    setWeight(initialProduct.weight_options?.[0] ?? null)
    setQty(1)
  }, [initialProduct.id])

  useEffect(() => {
    setFlavor(activeProduct.flavors?.[0] ?? null)
    setWeight(activeProduct.weight_options?.[0] ?? null)
    setQty(1)
  }, [activeProduct.id])

  const product = activeProduct
  const outOfStock = !product.is_in_stock
  const isJerky = product.category === 'jerky'
  const isBoard = product.category === 'boards'
  const showQuantity = !isJerky && !isBoard
  const hasMultipleSizes = isBoard && variants.length > 1

  const lineTotal = useMemo(() => {
    if (isJerky && weight) return product.price * weight
    return product.price * qty
  }, [isJerky, weight, product.price, qty])

  const unitPrice = isJerky && weight ? product.price * weight : product.price

  function handleAdd() {
    if (outOfStock) return
    const item: CartItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      quantity: isJerky ? 1 : qty,
      selected_flavor: flavor,
      selected_weight: weight,
      selected_size: isBoard ? product.size_label : null,
      unit_price: unitPrice,
      line_total: lineTotal,
      image_url: product.image_url,
    }
    onAdd(item)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="catalog-modal-slide-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative shrink-0">
          <ProductImage product={product} className="h-56 sm:h-64" rounded="top-lg" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-gray-600 shadow-md hover:bg-white"
            aria-label="Close product details"
            type="button"
          >
            ×
          </button>
          {outOfStock && (
            <div className="absolute bottom-3 left-3 rounded-full bg-gray-800 px-3 py-1.5 text-sm font-bold text-white">
              Out of Stock
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <span
            className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
            style={{ background: 'var(--navy)' }}
          >
            {categoryLabel(product.category)}
          </span>

          <h2 className="text-2xl font-black leading-tight text-gray-900">{product.name}</h2>

          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--orange)' }}>
            {formatPrice(product)}
          </p>

          {product.description && (
            <p className="mt-4 text-base leading-relaxed text-gray-600">{product.description}</p>
          )}

          {isJerky && (
            <>
              {product.flavors && product.flavors.length > 0 && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold text-gray-700">Flavor</label>
                  <select
                    value={flavor ?? ''}
                    onChange={e => setFlavor(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-gray-200 px-3 text-base focus:border-orange-400 focus:outline-none"
                  >
                    {product.flavors.map(f => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {product.weight_options && product.weight_options.length > 0 && (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-bold text-gray-700">Weight</label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.weight_options.map(w => (
                      <button
                        key={w}
                        onClick={() => setWeight(w)}
                        type="button"
                        className={`min-h-12 rounded-xl border-2 px-3 text-base font-semibold transition-all ${
                          weight === w
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {w} lb — ${(product.price * w).toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {hasMultipleSizes && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-gray-700">Size</label>
              <div className="grid gap-2">
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveProduct(variant)}
                    disabled={!variant.is_in_stock}
                    className={`flex min-h-12 items-center justify-between rounded-xl border-2 px-4 text-base font-semibold transition-all disabled:opacity-40 ${
                      activeProduct.id === variant.id
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{variant.size_label ?? variant.name}</span>
                    <span>${variant.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isBoard && !hasMultipleSizes && product.size_label && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-gray-700">Size</label>
              <div className="min-h-12 rounded-xl border-2 border-orange-500 bg-orange-50 px-4 py-3 text-base font-semibold text-orange-700">
                {product.size_label}
              </div>
            </div>
          )}

          {showQuantity && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                {product.sold_as === 'per_pack' && product.pack_size
                  ? `Quantity (packs of ${product.pack_size})`
                  : 'Quantity'}
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="flex h-12 min-w-12 items-center justify-center rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 hover:border-gray-400"
                  type="button"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-2xl font-black">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="flex h-12 min-w-12 items-center justify-center rounded-full border-2 border-gray-200 text-xl font-bold text-gray-600 hover:border-gray-400"
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {!outOfStock && (
            <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-semibold text-gray-500">Total</span>
              <span className="text-2xl font-black" style={{ color: 'var(--orange)' }}>
                ${lineTotal.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {outOfStock ? (
            <div className="flex min-h-14 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-500">
              Out of Stock
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="min-h-14 w-full rounded-xl text-lg font-black text-white transition-colors"
              style={{ background: 'var(--navy)' }}
              type="button"
            >
              Add to Cart — ${lineTotal.toFixed(2)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
