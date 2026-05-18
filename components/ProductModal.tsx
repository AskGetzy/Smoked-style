'use client'

import { useState } from 'react'
import type { Product, CartItem } from '@/types'

interface Props {
  product: Product
  onClose: () => void
  onAdd: (item: CartItem) => void
}

export default function ProductModal({ product, onClose, onAdd }: Props) {
  const [flavor, setFlavor] = useState(product.flavors?.[0] ?? null)
  const [weight, setWeight] = useState(product.weight_options?.[0] ?? null)
  const [size, setSize] = useState(product.size_label ?? null)
  const [qty, setQty] = useState(1)

  function calcPrice(): number {
    if (product.category === 'jerky' && weight) return product.price * weight
    if (product.sold_as === 'per_pack' && product.pack_size) return product.price * qty
    return product.price * qty
  }

  function handleAdd() {
    const unitPrice = product.category === 'jerky' && weight
      ? product.price * weight
      : product.price

    const item: CartItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      quantity: product.category === 'jerky' ? 1 : qty,
      selected_flavor: flavor,
      selected_weight: weight,
      selected_size: size,
      unit_price: unitPrice,
      line_total: unitPrice * (product.category === 'jerky' ? 1 : qty),
      image_url: product.image_url,
    }
    onAdd(item)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl max-h-[92dvh] w-full max-w-sm overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between border-b border-gray-100 p-5">
          <h3 className="text-xl font-bold text-gray-900 pr-4">{product.name}</h3>
          <button
            onClick={onClose}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-500 hover:text-gray-700"
            aria-label="Close product options"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-4">
          {product.description && (
            <p className="text-gray-500 text-sm mb-4">{product.description}</p>
          )}

          {/* Jerky: flavor + weight */}
          {product.category === 'jerky' && (
            <>
              {product.flavors && product.flavors.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Flavor</label>
                  <select
                    value={flavor ?? ''}
                    onChange={e => setFlavor(e.target.value)}
                    className="w-full min-h-12 border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-orange-400"
                  >
                    {product.flavors.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              )}
              {product.weight_options && product.weight_options.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight</label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.weight_options.map(w => (
                      <button
                        key={w}
                        onClick={() => setWeight(w)}
                        type="button"
                        className={`min-h-12 py-2 px-3 rounded-xl text-base font-semibold border-2 transition-all ${
                          weight === w
                            ? 'border-orange-500 text-orange-600 bg-orange-50'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {w} lb — ${(product.price * w).toFixed(0)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quantity (non-jerky) */}
          {product.category !== 'jerky' && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {product.sold_as === 'per_pack' ? `Quantity (packs of ${product.pack_size})` : 'Quantity'}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-full border-2 border-gray-200 font-bold text-gray-600 hover:border-gray-400"
                  type="button"
                >−</button>
                <span className="text-xl font-bold w-8 text-center">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-11 h-11 rounded-full border-2 border-gray-200 font-bold text-gray-600 hover:border-gray-400"
                  type="button"
                >+</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* Price total */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-gray-500 text-sm">Total</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>${calcPrice().toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="min-h-12 rounded-xl border border-gray-200 bg-white font-bold text-gray-700"
              type="button"
            >
              Back
            </button>
            <button
              onClick={handleAdd}
              className="min-h-12 text-white font-bold rounded-xl transition-colors"
              style={{ background: 'var(--navy)' }}
              type="button"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
