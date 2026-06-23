'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Product, CartItem } from '@/types'
import ProductImage from '@/components/ProductImage'
import { categoryLabel, formatPrice } from '@/lib/product-display'
import { ORDER_TRACKING_CONTACT_PHONE } from '@/lib/order-tracking'
import {
  JERKY_MAX_WEIGHT,
  JERKY_MIN_WEIGHT,
  defaultJerkyWeight,
  getFirstAvailableJerkyFlavor,
  getJerkyFlavors,
  isValidJerkyWeight,
  isJerkyFlavorAvailable,
} from '@/lib/jerky-stock'
import {
  getAvailableStock,
  getMaxLineQuantity,
  isWeightBasedProduct,
  isOutOfStock,
} from '@/lib/product-stock'

interface Props {
  product: Product
  cart: CartItem[]
  sizeVariants?: Product[]
  onClose: () => void
  onAdd: (item: CartItem) => void
}

export default function ProductModal({ product: initialProduct, cart, sizeVariants = [], onClose, onAdd }: Props) {
  const variants = sizeVariants.length > 1 ? sizeVariants : [initialProduct]
  const [activeProduct, setActiveProduct] = useState(initialProduct)
  const [flavor, setFlavor] = useState(initialProduct.flavors?.[0] ?? null)
  const [weight, setWeight] = useState(
    initialProduct.category === 'jerky' && isWeightBasedProduct(initialProduct)
      ? defaultJerkyWeight()
      : initialProduct.weight_options?.[0] ?? null,
  )
  const [qty, setQty] = useState(1)

  function defaultFlavorFor(product: Product) {
    return getFirstAvailableJerkyFlavor(product) ?? getJerkyFlavors(product)[0] ?? null
  }

  useEffect(() => {
    setActiveProduct(initialProduct)
    setFlavor(
      initialProduct.category === 'jerky'
        ? defaultFlavorFor(initialProduct)
        : initialProduct.flavors?.[0] ?? null,
    )
    setWeight(
      initialProduct.category === 'jerky' && isWeightBasedProduct(initialProduct)
        ? defaultJerkyWeight()
        : initialProduct.weight_options?.[0] ?? null,
    )
    setQty(1)
  }, [initialProduct.id])

  useEffect(() => {
    setFlavor(
      activeProduct.category === 'jerky'
        ? defaultFlavorFor(activeProduct)
        : activeProduct.flavors?.[0] ?? null,
    )
    setWeight(
      activeProduct.category === 'jerky' && isWeightBasedProduct(activeProduct)
        ? defaultJerkyWeight()
        : activeProduct.weight_options?.[0] ?? null,
    )
    setQty(1)
  }, [activeProduct.id])

  const product = activeProduct
  const outOfStock = isOutOfStock(product)
  const inquiryOnly = Boolean(product.customer_inquiry_only)
  const isJerky = product.category === 'jerky'
  const isWeightBased = isWeightBasedProduct(product)
  const isBoard = product.sold_as === 'per_board'
  const showQuantity = !isWeightBased && !isBoard
  const hasMultipleSizes = variants.length > 1
  const variantLabel = isBoard ? 'Size' : 'Cut'
  const jerkyWeightValid = !isJerky || !isWeightBased || isValidJerkyWeight(weight)

  const lineKey = useMemo(
    () => ({
      product_id: product.id,
      selected_flavor: isJerky ? flavor : null,
      selected_weight: isWeightBased ? weight : null,
      selected_size: product.size_label ?? null,
    }),
    [product.id, product.size_label, flavor, weight, isJerky, isWeightBased],
  )

  const maxQty = useMemo(
    () => getMaxLineQuantity(product, cart, lineKey),
    [product, cart, lineKey],
  )

  const maxJerkyWeight = useMemo(
    () => Math.min(JERKY_MAX_WEIGHT, maxQty),
    [maxQty],
  )

  useEffect(() => {
    if (!showQuantity) return
    if (qty > maxQty && maxQty > 0) setQty(maxQty)
  }, [maxQty, qty, showQuantity])

  const lineTotal = useMemo(() => {
    if (isWeightBased) return product.price * (weight ?? 0)
    return product.price * qty
  }, [isWeightBased, weight, product.price, qty])

  const unitPrice = isWeightBased ? product.price * (weight ?? 0) : product.price

  function handleAdd() {
    if (inquiryOnly) return
    if (outOfStock || maxQty <= 0) return
    if (isJerky && flavor && !isJerkyFlavorAvailable(product, flavor)) return
    if (isJerky && isWeightBased && !jerkyWeightValid) return
    if (isWeightBased && weight && weight > maxQty) return
    if (!isWeightBased && qty > maxQty) return
    const item: CartItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      quantity: isWeightBased ? 1 : qty,
      selected_flavor: isJerky ? flavor : null,
      selected_weight: isWeightBased ? weight : null,
      selected_size: product.size_label ?? null,
      unit_price: unitPrice,
      line_total: lineTotal,
      image_url: product.image_url,
    }
    onAdd(item)
  }

  const selectedVariantClass =
    'border-[1.5px] text-white'
  const selectedVariantStyle = { borderColor: 'var(--rustic-navy)', background: 'var(--rustic-navy)' }
  const defaultVariantClass =
    'border-[1.5px] text-gray-700 hover:border-[var(--rustic-ember)]'
  const defaultVariantStyle = { borderColor: 'var(--rustic-rule)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="catalog-modal-slide-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative shrink-0 px-4 pt-4">
          <ProductImage product={product} className="h-56 sm:h-64" rounded="top-lg" outOfStock={outOfStock} />
          <button
            onClick={onClose}
            className="absolute right-7 top-7 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-gray-600 shadow-md hover:bg-white"
            aria-label="Close product details"
            type="button"
          >
            ×
          </button>
          {outOfStock && (
            <div
              className="absolute bottom-3 left-7 rounded-full px-3 py-1.5 text-sm font-bold text-white"
              style={{ background: 'rgba(120,105,90,0.92)' }}
            >
              Out of Stock
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <span className="rustic-section-label mb-2 inline-block">
            {categoryLabel(product.category)}
          </span>

          <h2
            className="text-[26px] font-bold leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: 'var(--rustic-smoke)' }}
          >
            {product.name}
          </h2>

          {inquiryOnly ? (
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-700">
              Available by phone inquiry
            </p>
          ) : (
            <p
              className="mt-2 text-[22px] font-semibold"
              style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--rustic-navy)' }}
            >
              {formatPrice(product)}
            </p>
          )}

          {product.description && (
            <p
              className="mt-4 text-[15px] leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--rustic-muted)' }}
            >
              {product.description}
            </p>
          )}

          {inquiryOnly && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-900">
                This item is available through direct inquiry only.
              </p>
              <a
                href="tel:7188109472"
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-800"
              >
                Call {ORDER_TRACKING_CONTACT_PHONE}
              </a>
            </div>
          )}

          {!inquiryOnly && isJerky && (
            <>
              {getJerkyFlavors(product).length > 0 && (
                <div className="mt-5">
                  <label className="rustic-section-label mb-2 block">Flavor</label>
                  <select
                    value={flavor ?? ''}
                    onChange={e => setFlavor(e.target.value)}
                    className="min-h-12 w-full rounded-xl border px-3 text-base focus:outline-none"
                    style={{ borderColor: 'var(--rustic-rule)' }}
                  >
                    {getJerkyFlavors(product).map(f => {
                      const available = isJerkyFlavorAvailable(product, f)
                      return (
                        <option key={f} value={f} disabled={!available}>
                          {available ? f : `${f} — Out of stock`}
                        </option>
                      )
                    })}
                  </select>
                  {flavor && !isJerkyFlavorAvailable(product, flavor) && (
                    <p className="mt-2 text-sm font-medium text-red-600">This flavor is currently unavailable.</p>
                  )}
                </div>
              )}
              {isWeightBased && isJerky && (
                <div className="mt-4">
                  <label className="rustic-section-label mb-2 block">Weight</label>
                  <input
                    type="number"
                    min={JERKY_MIN_WEIGHT}
                    max={JERKY_MAX_WEIGHT}
                    step={JERKY_MIN_WEIGHT}
                    value={weight ?? ''}
                    onChange={e => setWeight(e.target.value === '' ? null : Number(e.target.value))}
                    className="min-h-12 w-full rounded-xl border px-3 text-base focus:outline-none"
                    style={{ borderColor: 'var(--rustic-rule)' }}
                  />
                  <p className="mt-2 text-sm text-gray-500">Enter any weight from 0.25 lb to 4 lb.</p>
                  {weight != null && !jerkyWeightValid && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      Enter a weight between 0.25 lb and 4 lb in 0.25 lb increments.
                    </p>
                  )}
                  {maxJerkyWeight > 0 && maxJerkyWeight < JERKY_MIN_WEIGHT && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      This flavor does not have enough stock for the minimum 0.25 lb order.
                    </p>
                  )}
                </div>
              )}
              {isWeightBased && !isJerky && product.weight_options && product.weight_options.length > 0 && (
                <div className="mt-4">
                  <label className="rustic-section-label mb-2 block">Weight</label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.weight_options.map(w => {
                      const availableWeight = isJerky
                        ? flavor && isJerkyFlavorAvailable(product, flavor)
                          ? getAvailableStock(product, flavor)
                          : 0
                        : getAvailableStock(product)
                      const weightDisabled = !availableWeight || w > availableWeight
                      return (
                        <button
                          key={w}
                          onClick={() => !weightDisabled && setWeight(w)}
                          type="button"
                          disabled={weightDisabled}
                          className={`min-h-12 rounded-xl px-3 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                            weight === w ? selectedVariantClass : defaultVariantClass
                          }`}
                          style={weight === w ? selectedVariantStyle : defaultVariantStyle}
                        >
                          {w} lb — ${(product.price * w).toFixed(2)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {!inquiryOnly && hasMultipleSizes && (
            <div className="mt-5">
              <label className="rustic-section-label mb-2 block">{variantLabel}</label>
              <div className="grid gap-2">
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveProduct(variant)}
                    disabled={isOutOfStock(variant)}
                    className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-semibold transition-all disabled:opacity-40 ${
                      activeProduct.id === variant.id ? selectedVariantClass : defaultVariantClass
                    }`}
                    style={activeProduct.id === variant.id ? selectedVariantStyle : defaultVariantStyle}
                  >
                    <span>{variant.size_label ?? variant.name}</span>
                    <span>
                      {variant.category === 'jerky'
                        ? `$${variant.price.toFixed(2)}/lb`
                        : `$${variant.price.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!inquiryOnly && isBoard && !hasMultipleSizes && product.size_label && (
            <div className="mt-5">
              <label className="rustic-section-label mb-2 block">Size</label>
              <div
                className="min-h-12 rounded-xl px-4 py-3 text-base font-semibold text-white"
                style={{ border: '1.5px solid var(--rustic-navy)', background: 'var(--rustic-navy)' }}
              >
                {product.size_label}
              </div>
            </div>
          )}

          {!inquiryOnly && showQuantity && (
            <div className="mt-5">
              <label className="rustic-section-label mb-2 block">
                {product.sold_as === 'per_pack' && product.pack_size
                  ? `Quantity (packs of ${product.pack_size})`
                  : 'Quantity'}
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-12 min-w-12 items-center justify-center rounded-full text-xl font-bold text-gray-600 disabled:opacity-40"
                  style={{ border: '1.5px solid var(--rustic-rule)' }}
                  type="button"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-2xl font-black">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  className="flex h-12 min-w-12 items-center justify-center rounded-full text-xl font-bold text-gray-600 disabled:opacity-40"
                  style={{ border: '1.5px solid var(--rustic-rule)' }}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {!inquiryOnly && !outOfStock && (
            <div
              className="mt-5 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'var(--rustic-bg)' }}
            >
              <span className="rustic-section-label">Total</span>
              <span
                className="text-[22px] font-semibold"
                style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--rustic-navy)' }}
              >
                ${lineTotal.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 shrink-0 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          style={{ borderTop: '1px solid var(--rustic-rule)' }}
        >
          {inquiryOnly ? (
            <a
              href="tel:7188109472"
              className="flex min-h-14 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-lg font-black text-amber-900"
            >
              Call Inquiry - {ORDER_TRACKING_CONTACT_PHONE}
            </a>
          ) : outOfStock || maxQty <= 0 || (isJerky && isWeightBased && maxJerkyWeight < JERKY_MIN_WEIGHT) ? (
            <div className="flex min-h-14 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-500">
              Out of Stock
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span
                className="text-[22px] font-semibold"
                style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--rustic-navy)' }}
              >
                ${lineTotal.toFixed(2)}
              </span>
              <button
                onClick={handleAdd}
                disabled={
                  isWeightBased
                    ? (isJerky && (!flavor || !isJerkyFlavorAvailable(product, flavor) || !jerkyWeightValid))
                      || !weight
                      || (weight ?? 0) > maxQty
                    : qty > maxQty
                }
                className="min-h-14 flex-1 rounded-xl px-6 text-base font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'var(--rustic-ember)' }}
                type="button"
              >
                Add to Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
