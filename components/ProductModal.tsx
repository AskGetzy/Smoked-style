'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Product, CartItem } from '@/types'
import ProductImage from '@/components/ProductImage'
import { categoryLabel, formatPrice } from '@/lib/product-display'
import {
  getFirstAvailableJerkyFlavor,
  getJerkyFlavors,
  isJerkyFlavorAvailable,
} from '@/lib/jerky-stock'
import {
  formatStockLeft,
  getAvailableStock,
  getMaxLineQuantity,
  getRemainingStock,
  isOutOfStock,
} from '@/lib/product-stock'

interface Props {
  product: Product
  cart: CartItem[]
  sizeVariants?: Product[]
  onClose: () => void
  onAdd: (item: CartItem) => void
}

export default function ProductModal({
  product: initialProduct,
  cart,
  sizeVariants = [],
  onClose,
  onAdd,
}: Props) {
  const variants = sizeVariants.length > 1 ? sizeVariants : [initialProduct]
  const [activeProduct, setActiveProduct] = useState(initialProduct)
  const [flavor, setFlavor] = useState(initialProduct.flavors?.[0] ?? null)
  const [weight, setWeight] = useState(initialProduct.weight_options?.[0] ?? null)
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
    setWeight(initialProduct.weight_options?.[0] ?? null)
    setQty(1)
  }, [initialProduct.id])

  useEffect(() => {
    setFlavor(
      activeProduct.category === 'jerky'
        ? defaultFlavorFor(activeProduct)
        : activeProduct.flavors?.[0] ?? null,
    )
    setWeight(activeProduct.weight_options?.[0] ?? null)
    setQty(1)
  }, [activeProduct.id])

  const product = activeProduct
  const outOfStock = isOutOfStock(product)
  const isJerky = product.category === 'jerky'
  const isBoard = product.category === 'boards'
  const showQuantity = !isJerky && !isBoard
  const hasMultipleSizes = isBoard && variants.length > 1

  const lineKey = useMemo(
    () => ({
      product_id: product.id,
      selected_flavor: flavor,
      selected_weight: isJerky ? weight : null,
      selected_size: isBoard ? product.size_label : null,
    }),
    [product.id, product.size_label, flavor, weight, isJerky, isBoard],
  )

  const remainingStock = useMemo(
    () => getRemainingStock(product, cart, lineKey),
    [product, cart, lineKey],
  )

  const maxQty = useMemo(
    () => getMaxLineQuantity(product, cart, lineKey),
    [product, cart, lineKey],
  )

  const stockHint = formatStockLeft(product, remainingStock)

  useEffect(() => {
    if (!showQuantity) return
    if (qty > maxQty && maxQty > 0) setQty(maxQty)
  }, [maxQty, qty, showQuantity])

  const lineTotal = useMemo(() => {
    if (isJerky && weight) return product.price * weight
    return product.price * qty
  }, [isJerky, weight, product.price, qty])

  const unitPrice = isJerky && weight ? product.price * weight : product.price

  function handleAdd() {
    if (outOfStock || maxQty <= 0) return
    if (isJerky && flavor && !isJerkyFlavorAvailable(product, flavor)) return
    if (isJerky && weight && weight > maxQty) return
    if (!isJerky && qty > maxQty) return

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

  const addDisabled = isJerky
    ? !flavor || !isJerkyFlavorAvailable(product, flavor) || !weight || (weight ?? 0) > maxQty
    : qty > maxQty

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,11,8,0.74)] backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="catalog-modal-slide-up flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-[linear-gradient(180deg,#fff9ef,#f6ecdd)] shadow-[0_36px_100px_rgba(15,10,8,0.4)] sm:rounded-[2rem] md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative shrink-0 md:w-[44%]">
          <ProductImage
            product={product}
            className="h-64 md:h-full md:min-h-[680px]"
            rounded="top-lg"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(20,14,10,0.52))]" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/90 text-xl font-bold text-stone-700 shadow-md transition hover:bg-white"
            aria-label="Close product details"
            type="button"
          >
            ×
          </button>
          <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white backdrop-blur-sm">
            {categoryLabel(product.category)}
          </div>
          <div className="absolute bottom-5 left-5 right-5 text-white">
            {outOfStock && (
              <div className="mb-3 inline-flex rounded-full bg-stone-950/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
                Out of stock
              </div>
            )}
            <div className="max-w-sm font-serif text-3xl font-bold leading-tight">
              {product.name}
            </div>
            <div className="mt-3 text-2xl font-black" style={{ color: '#ffd49c' }}>
              {formatPrice(product)}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
                From the counter
              </div>
              <h2 className="mt-2 font-serif text-3xl font-bold text-stone-900 md:text-[2.1rem]">
                {product.name}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-stone-200 bg-stone-100/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-stone-700">
                  {categoryLabel(product.category)}
                </span>
                {product.size_label && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                    {product.size_label}
                  </span>
                )}
              </div>
              {product.description && (
                <p className="mt-4 text-sm leading-7 text-stone-600">{product.description}</p>
              )}
            </div>

            {isJerky && getJerkyFlavors(product).length > 0 && (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200/70 bg-white/60 p-5">
                <SectionLabel
                  title="Flavor"
                  subtitle="Choose from the currently available smokehouse blends."
                />
                <select
                  value={flavor ?? ''}
                  onChange={e => setFlavor(e.target.value)}
                  className="mt-3 min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 text-base text-stone-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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
                  <p className="mt-3 text-sm font-medium text-red-700">
                    This flavor is currently unavailable.
                  </p>
                )}
              </div>
            )}

            {isJerky && product.weight_options && product.weight_options.length > 0 && (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200/70 bg-white/60 p-5">
                <SectionLabel title="Weight" subtitle="Select the cut weight you want packaged." />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {product.weight_options.map(w => {
                    const flavorAvailable =
                      flavor && isJerkyFlavorAvailable(product, flavor)
                        ? getAvailableStock(product, flavor)
                        : 0
                    const weightDisabled = !flavorAvailable || w > flavorAvailable
                    return (
                      <button
                        key={w}
                        onClick={() => !weightDisabled && setWeight(w)}
                        type="button"
                        disabled={weightDisabled}
                        className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          weight === w
                            ? 'border-orange-300 bg-orange-50 text-orange-900 shadow-sm'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                        }`}
                      >
                        <div className="text-base font-bold">{w} lb</div>
                        <div className="mt-1 text-sm text-stone-500">${(product.price * w).toFixed(2)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {hasMultipleSizes && (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200/70 bg-white/60 p-5">
                <SectionLabel title="Size" subtitle="Pick the board size that fits the table." />
                <div className="mt-3 grid gap-2">
                  {variants.map(variant => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setActiveProduct(variant)}
                      disabled={isOutOfStock(variant)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition disabled:opacity-40 ${
                        activeProduct.id === variant.id
                          ? 'border-orange-300 bg-orange-50 text-orange-900 shadow-sm'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="font-semibold">{variant.size_label ?? variant.name}</span>
                      <span className="text-sm font-bold">${variant.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isBoard && !hasMultipleSizes && product.size_label && (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200/70 bg-white/60 p-5">
                <SectionLabel title="Size" subtitle="This board comes in a single signature size." />
                <div className="mt-3 rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-base font-bold text-orange-900">
                  {product.size_label}
                </div>
              </div>
            )}

            {showQuantity && (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200/70 bg-white/60 p-5">
                <SectionLabel
                  title={
                    product.sold_as === 'per_pack' && product.pack_size
                      ? `Quantity (packs of ${product.pack_size})`
                      : 'Quantity'
                  }
                  subtitle="Adjust the quantity while stock is still available."
                />
                {stockHint && (
                  <p className="mt-3 text-sm font-medium text-amber-800">{stockHint}</p>
                )}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="flex h-12 min-w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-xl font-bold text-stone-700 shadow-sm transition hover:border-stone-400 disabled:opacity-40"
                    type="button"
                  >
                    −
                  </button>
                  <span className="min-w-10 text-center text-3xl font-black text-stone-900">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    className="flex h-12 min-w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-xl font-bold text-stone-700 shadow-sm transition hover:border-stone-400 disabled:opacity-40"
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {isJerky && stockHint && (
              <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-900">
                {stockHint}
              </div>
            )}

            {!outOfStock && (
              <div className="mt-5 rounded-[1.6rem] border border-stone-200/70 bg-[linear-gradient(135deg,#fffdf8,#f6efe3)] p-5 shadow-sm">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">
                      Order total
                    </div>
                    <div className="mt-2 text-3xl font-black text-stone-900">
                      ${lineTotal.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-stone-500">
                    <div>Unit price</div>
                    <div className="mt-1 font-semibold text-stone-800">${unitPrice.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-stone-200/70 bg-[rgba(255,251,244,0.86)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-7">
            {outOfStock || maxQty <= 0 ? (
              <div className="flex min-h-14 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-lg font-bold text-stone-500">
                Out of Stock
              </div>
            ) : (
              <button
                onClick={handleAdd}
                disabled={addDisabled}
                className="min-h-14 w-full rounded-2xl border border-[#1f2c48] bg-[linear-gradient(135deg,#1a2744,#322116)] text-lg font-black text-white shadow-[0_16px_34px_rgba(27,18,13,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                Add to Cart — ${lineTotal.toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-600">{subtitle}</p>
    </div>
  )
}
