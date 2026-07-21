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

  const selectedChipStyle = {
    background: 'var(--rustic-navy)',
    color: '#ffffff',
    borderColor: 'var(--rustic-navy)',
  }
  const defaultChipStyle = {
    background: 'var(--rustic-surface)',
    color: 'var(--rustic-smoke)',
    borderColor: 'var(--rustic-rule)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="catalog-modal-slide-up relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden shadow-2xl sm:rounded-2xl"
        style={{ background: 'var(--rustic-bg)', borderRadius: '24px 24px 0 0' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative shrink-0">
          <ProductImage product={product} className="h-64 sm:h-72" rounded="none" outOfStock={outOfStock} />
          <button
            onClick={onClose}
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold shadow-sm"
            style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--rustic-smoke)' }}
            aria-label="Close product details"
            type="button"
          >
            ←
          </button>
          {outOfStock && (
            <div
              className="absolute bottom-3 left-4 rounded-full px-3 py-1.5 text-sm font-bold text-white"
              style={{ background: 'rgba(120,105,90,0.92)' }}
            >
              Out of Stock
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="rustic-section-label mb-2 inline-block">
                {categoryLabel(product.category)}
              </span>
              <h2
                className="text-[24px] font-semibold leading-tight"
                style={{ fontFamily: "'Playfair Display', serif", color: 'var(--rustic-smoke)' }}
              >
                {product.name}
              </h2>
            </div>
            {!inquiryOnly && (
              <div
                className="shrink-0 text-[20px] font-bold"
                style={{ color: 'var(--rustic-smoke)' }}
              >
                {formatPrice(product).replace(/\/\w+$/, '')}
              </div>
            )}
          </div>

          {inquiryOnly && (
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--rustic-ember-dim)' }}>
              Available by phone inquiry
            </p>
          )}

          {product.description && (
            <p
              className="mt-4 text-[14px] leading-relaxed"
              style={{ fontFamily: "'Work Sans', system-ui, sans-serif", color: 'var(--rustic-ink-soft)' }}
            >
              {product.description}
            </p>
          )}

          {inquiryOnly && (
            <div
              className="mt-5 rounded-2xl px-4 py-4"
              style={{ border: '1px solid var(--rustic-rule)', background: 'var(--rustic-green-pale)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--rustic-navy)' }}>
                This item is available through direct inquiry only.
              </p>
              <a
                href="tel:7188109472"
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold"
                style={{
                  border: '1px solid var(--rustic-rule)',
                  background: 'var(--rustic-surface)',
                  color: 'var(--rustic-navy)',
                }}
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
                    className="min-h-12 w-full rounded-full border px-4 text-base focus:outline-none"
                    style={{ borderColor: 'var(--rustic-rule)', background: 'var(--rustic-surface)' }}
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
                    className="min-h-12 w-full rounded-full border px-4 text-base focus:outline-none"
                    style={{ borderColor: 'var(--rustic-rule)', background: 'var(--rustic-surface)' }}
                  />
                  <p className="mt-2 text-sm" style={{ color: 'var(--rustic-muted)' }}>
                    Enter any weight from 0.25 lb to 4 lb.
                  </p>
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
                  <div className="flex flex-wrap gap-2">
                    {product.weight_options.map(w => {
                      const availableWeight = getAvailableStock(product)
                      const weightDisabled = !availableWeight || w > availableWeight
                      const selected = weight === w
                      return (
                        <button
                          key={w}
                          onClick={() => !weightDisabled && setWeight(w)}
                          type="button"
                          disabled={weightDisabled}
                          className="min-h-11 rounded-full px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            border: '1px solid',
                            ...(selected ? selectedChipStyle : defaultChipStyle),
                          }}
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
              <div className="flex flex-wrap gap-2">
                {variants.map(variant => {
                  const selected = activeProduct.id === variant.id
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setActiveProduct(variant)}
                      disabled={isOutOfStock(variant)}
                      className="min-h-11 rounded-full px-4 text-sm font-semibold transition-all disabled:opacity-40"
                      style={{
                        border: '1px solid',
                        ...(selected ? selectedChipStyle : defaultChipStyle),
                      }}
                    >
                      {variant.size_label ?? variant.name}
                      {' · '}
                      {variant.category === 'jerky'
                        ? `$${variant.price.toFixed(2)}/lb`
                        : `$${variant.price.toFixed(2)}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!inquiryOnly && isBoard && !hasMultipleSizes && product.size_label && (
            <div className="mt-5">
              <label className="rustic-section-label mb-2 block">Size</label>
              <div
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-white"
                style={{ background: 'var(--rustic-navy)' }}
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
                  className="flex h-11 min-w-11 items-center justify-center rounded-full text-xl font-bold disabled:opacity-40"
                  style={{ border: '1.5px solid var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
                  type="button"
                >
                  −
                </button>
                <span className="min-w-8 text-center text-2xl font-bold">{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  className="flex h-11 min-w-11 items-center justify-center rounded-full text-xl font-bold disabled:opacity-40"
                  style={{ border: '1.5px solid var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {!inquiryOnly && product.sold_as && (
            <div
              className="mt-5 flex flex-col gap-2 rounded-[14px] px-4 py-3.5"
              style={{ background: 'var(--rustic-surface)', border: '1px solid var(--rustic-rule)' }}
            >
              <div className="flex justify-between text-[13px]" style={{ color: 'var(--rustic-ink-soft)' }}>
                <span>Sold as</span>
                <span className="font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
                  {product.sold_as.replace(/_/g, ' ')}
                </span>
              </div>
              {product.size_label && (
                <div className="flex justify-between text-[13px]" style={{ color: 'var(--rustic-ink-soft)' }}>
                  <span>Size</span>
                  <span className="font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
                    {product.size_label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 shrink-0 px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3.5"
          style={{
            background: 'rgba(244, 240, 232, 0.94)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid var(--rustic-rule)',
          }}
        >
          {inquiryOnly ? (
            <a
              href="tel:7188109472"
              className="flex min-h-14 w-full items-center justify-center rounded-full px-4 text-base font-bold"
              style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
            >
              Call Inquiry — {ORDER_TRACKING_CONTACT_PHONE}
            </a>
          ) : outOfStock || maxQty <= 0 || (isJerky && isWeightBased && maxJerkyWeight < JERKY_MIN_WEIGHT) ? (
            <div
              className="flex min-h-14 items-center justify-center rounded-full text-base font-bold"
              style={{ background: 'var(--rustic-rule)', color: 'var(--rustic-muted)' }}
            >
              Out of Stock
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={
                isWeightBased
                  ? (isJerky && (!flavor || !isJerkyFlavorAvailable(product, flavor) || !jerkyWeightValid))
                    || !weight
                    || (weight ?? 0) > maxQty
                  : qty > maxQty
              }
              className="flex min-h-14 w-full items-center justify-center rounded-full px-6 text-[15px] font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
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
