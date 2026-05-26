'use client'

import { useEffect, useMemo, useState } from 'react'
import { isWeightBasedProduct } from '@/lib/product-stock'
import type { BossLine, Product } from '@/types'

type Props = {
  product: Product | null
  sizeVariants?: Product[]
  onClose: () => void
  onAdd: (line: BossLine) => void
}

function buildLine(product: Product, flavor: string, weight: number | null, qty: number): BossLine {
  const isJerky = product.category === 'jerky'
  const isWeightBased = isWeightBasedProduct(product)
  const selectedWeight = isWeightBased ? weight : null
  const unitPrice =
    isWeightBased && selectedWeight
      ? product.price * selectedWeight
      : product.price
  const quantity = isWeightBased ? 1 : qty

  return {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
    quantity,
    selected_flavor: isJerky ? flavor || null : null,
    selected_weight: selectedWeight,
    selected_size: product.size_label ?? null,
    unit_price: unitPrice,
    line_total: unitPrice * quantity,
  }
}

export default function BossProductSheet({ product: initialProduct, sizeVariants = [], onClose, onAdd }: Props) {
  const variants = sizeVariants.length > 1 ? sizeVariants : initialProduct ? [initialProduct] : []
  const [activeProduct, setActiveProduct] = useState<Product | null>(initialProduct)
  const [flavor, setFlavor] = useState('')
  const [weight, setWeight] = useState<number | null>(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setActiveProduct(initialProduct)
  }, [initialProduct?.id])

  useEffect(() => {
    if (!activeProduct) return
    setQty(1)
    setFlavor(activeProduct.flavors?.[0] ?? '')
    setWeight(activeProduct.weight_options?.[0] ?? null)
  }, [activeProduct?.id])

  const pricing = useMemo(() => {
    if (!activeProduct) return { lineTotal: 0, summary: '' }
    const line = buildLine(activeProduct, flavor, weight, qty)
    const isWeightBased = isWeightBasedProduct(activeProduct)

    let summary = ''
    if (isWeightBased && line.selected_weight) {
      summary = `$${activeProduct.price.toFixed(2)}/lb × ${line.selected_weight} lb = $${line.line_total.toFixed(2)}`
    } else if (line.quantity > 1) {
      summary = `$${line.unit_price.toFixed(2)} × ${line.quantity} = $${line.line_total.toFixed(2)}`
    } else {
      summary = `$${line.unit_price.toFixed(2)} × 1 = $${line.line_total.toFixed(2)}`
    }

    return { lineTotal: line.line_total, summary }
  }, [activeProduct, flavor, weight, qty])

  if (!activeProduct) return null

  const product = activeProduct
  const isJerky = product.category === 'jerky'
  const isWeightBased = isWeightBasedProduct(product)
  const isBoard = product.category === 'boards'
  const hasMultipleVariants = variants.length > 1
  const variantLabel = isBoard ? 'Size' : 'Cut'
  const basePriceLabel =
    isWeightBased
      ? `$${product.price.toFixed(2)}/lb`
      : `$${product.price.toFixed(2)}`

  function handleAdd() {
    if (!product) return
    onAdd(buildLine(product, flavor, weight, qty))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close product options"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="boss-sheet-slide-up relative flex h-[50dvh] max-h-[50vh] min-h-[40dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-4 py-4">
          <div className="min-w-0 pr-3">
            <h3 className="text-xl font-black text-gray-900">{product.name}</h3>
            <p className="text-base font-semibold text-orange-600">{basePriceLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold leading-none text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {isJerky && (product.flavors?.length ?? 0) > 0 && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">Flavor</label>
              <select
                value={flavor}
                onChange={e => setFlavor(e.target.value)}
                className="h-12 w-full rounded-2xl border px-4 text-base"
              >
                {(product.flavors ?? []).map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isWeightBased && (product.weight_options?.length ?? 0) > 0 && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">Weight</label>
              <div className="grid grid-cols-2 gap-2">
                {(product.weight_options ?? []).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setWeight(option)}
                    className={`min-h-12 rounded-2xl border-2 px-3 text-base font-bold ${
                      weight === option
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {option} lb
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasMultipleVariants && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">{variantLabel}</label>
              <div className="grid gap-2">
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveProduct(variant)}
                    className={`flex min-h-12 items-center justify-between rounded-2xl border-2 px-4 text-base font-bold ${
                      activeProduct.id === variant.id
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{variant.size_label ?? variant.name}</span>
                    <span>
                      {variant.sold_as === 'per_lb'
                        ? `$${variant.price.toFixed(2)}/lb`
                        : `$${variant.price.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasMultipleVariants && isBoard && product.size_label && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">Size</label>
              <div className="flex min-h-12 items-center rounded-2xl border-2 border-orange-500 bg-orange-50 px-4 text-base font-bold text-orange-700">
                {product.size_label}
              </div>
            </div>
          )}

          {!isWeightBased && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQty(current => Math.max(1, current - 1))}
                  className="flex h-12 min-w-12 items-center justify-center rounded-2xl border-2 border-gray-200 text-2xl font-bold text-gray-700"
                >
                  −
                </button>
                <span className="min-w-12 text-center text-2xl font-black">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(current => current + 1)}
                  className="flex h-12 min-w-12 items-center justify-center rounded-2xl border-2 border-gray-200 text-2xl font-bold text-gray-700"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-center">
            <div className="text-sm font-semibold text-gray-500">Line total</div>
            <div className="text-base font-bold text-gray-700">{pricing.summary}</div>
            <div className="text-2xl font-black text-orange-600">${pricing.lineTotal.toFixed(2)}</div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={handleAdd}
            className="min-h-14 w-full rounded-2xl text-lg font-black text-white"
            style={{ background: 'var(--orange)' }}
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  )
}
