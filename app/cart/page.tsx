'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import ProductImage from '@/components/ProductImage'
import StorefrontSignInModal from '@/components/StorefrontSignInModal'
import type { CartItem, Product } from '@/types'
import { useSupabaseUser } from '@/lib/use-supabase-user'
import { isJerkyFlavorAvailable } from '@/lib/jerky-stock'
import {
  getMaxLineQuantity,
  isCustomerVisible,
  isOutOfStock,
  isWeightBasedProduct,
} from '@/lib/product-stock'

export default function CartPage() {
  const { user, authReady, supabase } = useSupabaseUser()
  const [cart, setCart] = useState<CartItem[]>([])
  const [productsById, setProductsById] = useState<Map<string, Product>>(new Map())
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [notes, setNotes] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [showSignInModal, setShowSignInModal] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('smoked-cart')
    if (stored) setCart(JSON.parse(stored))
    const n = localStorage.getItem('smoked-notes')
    if (n) setNotes(n)
    const g = localStorage.getItem('smoked-gift')
    if (g) setGiftMessage(g)
  }, [])

  const productIds = useMemo(
    () => Array.from(new Set(cart.map(i => i.product_id).filter(Boolean))),
    [cart],
  )

  useEffect(() => {
    if (productIds.length === 0) {
      setProductsById(new Map())
      setProductsLoaded(true)
      return
    }

    let cancelled = false
    setProductsLoaded(false)

    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      if (cancelled) return

      if (error) {
        console.error('[cart] Failed to load products for stock check', error)
      }

      const map = new Map<string, Product>()
      for (const p of data ?? []) {
        map.set(p.id, p as Product)
      }
      setProductsById(map)
      setProductsLoaded(true)
    }

    void loadProducts()
    return () => { cancelled = true }
  }, [supabase, productIds])

  function saveCart(items: CartItem[]) {
    setCart(items)
    localStorage.setItem('smoked-cart', JSON.stringify(items))
  }

  function updateQty(id: string, delta: number) {
    const item = cart.find(i => i.id === id)
    if (!item) return
    const product = productsById.get(item.product_id)
    if (!product || isWeightBasedProduct(product)) return

    const lineKey = {
      product_id: item.product_id,
      selected_flavor: item.selected_flavor,
      selected_weight: item.selected_weight,
      selected_size: item.selected_size,
    }
    const maxQty = getMaxLineQuantity(product, cart, lineKey, item.id)
    const newQty = Math.max(1, Math.min(maxQty, item.quantity + delta))
    if (newQty === item.quantity) return

    const updated = cart.map(i =>
      i.id === id
        ? { ...i, quantity: newQty, line_total: newQty * i.unit_price }
        : i,
    )
    saveCart(updated)
  }

  function removeItem(id: string) {
    saveCart(cart.filter(i => i.id !== id))
  }

  function saveNotes(val: string) {
    setNotes(val)
    localStorage.setItem('smoked-notes', val)
  }

  function saveGift(val: string) {
    setGiftMessage(val)
    localStorage.setItem('smoked-gift', val)
  }

  function getCartProduct(item: CartItem): Product | undefined {
    return productsById.get(item.product_id)
  }

  function itemIsOutOfStock(item: CartItem): boolean {
    if (!productsLoaded) return false
    const product = getCartProduct(item)
    if (!product) return true
    if (!isCustomerVisible(product)) return true
    if (product.category === 'jerky' && item.selected_flavor) {
      return !isJerkyFlavorAvailable(product, item.selected_flavor)
    }
    return isOutOfStock(product)
  }

  const subtotal = cart.reduce((s, i) => s + i.line_total, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const hasOOS = cart.some(itemIsOutOfStock)

  function itemLabel(item: CartItem): string {
    const parts = [item.product_name]
    if (item.selected_flavor) parts.push(item.selected_flavor)
    if (item.selected_weight) parts.push(`${item.selected_weight} lb`)
    if (item.selected_size) parts.push(item.selected_size)
    return parts.join(' — ')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--rustic-bg)' }}>
      <Header
        cartCount={cartCount}
        cartTotal={subtotal}
        user={user}
        authReady={authReady}
        onSignIn={() => setShowSignInModal(true)}
        onSignOut={() => void supabase.auth.signOut()}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--rustic-smoke)' }}
        >
          Your Cart
        </h1>

        {cart.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mb-4 text-6xl">🛒</div>
            <p className="mb-6 text-lg" style={{ color: 'var(--rustic-muted)' }}>Your cart is empty</p>
            <Link
              href="/"
              className="inline-block rounded-xl px-6 py-3 font-semibold text-white"
              style={{ background: 'var(--rustic-navy)' }}
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              {hasOOS && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Some items are no longer available. Remove them before checkout.
                </div>
              )}

              <div
                className="divide-y divide-[var(--rustic-rule)] overflow-hidden"
                style={{
                  borderRadius: '18px',
                  background: 'var(--rustic-surface)',
                  boxShadow: '0 2px 16px rgba(44,24,16,0.07)',
                }}
              >
                {cart.map(item => {
                  const product = getCartProduct(item)
                  const unavailable = itemIsOutOfStock(item)
                  const canAdjustQty = Boolean(
                    product && productsLoaded && !unavailable && !isWeightBasedProduct(product),
                  )
                  const maxQty = product
                    ? getMaxLineQuantity(product, cart, {
                        product_id: item.product_id,
                        selected_flavor: item.selected_flavor,
                        selected_weight: item.selected_weight,
                        selected_size: item.selected_size,
                      }, item.id)
                    : 0
                  return (
                    <div
                      key={item.id}
                      className={`flex gap-4 p-4 ${unavailable ? 'border-l-4 border-red-400 bg-red-50' : ''}`}
                    >
                      <div className={`h-16 w-16 flex-shrink-0 ${unavailable ? 'opacity-60 grayscale' : ''}`}>
                        {product ? (
                          <ProductImage
                            product={product}
                            className="h-16 w-16"
                            rounded="top-lg"
                            sizes="64px"
                          />
                        ) : (
                          <div
                            className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
                            style={{ background: 'var(--rustic-bg)' }}
                          >
                            🥩
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--rustic-smoke)' }}>
                          {itemLabel(item)}
                        </p>
                        {unavailable ? (
                          <p className="mt-1 text-xs font-semibold text-red-600">This item is no longer available</p>
                        ) : (
                          <p className="mt-0.5 text-xs" style={{ color: 'var(--rustic-muted)' }}>
                            {product && isWeightBasedProduct(product)
                              ? `${product.price.toFixed(2)}/lb`
                              : `$${item.unit_price.toFixed(2)} each`}
                          </p>
                        )}
                        {canAdjustQty && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="h-7 w-7 rounded-full border text-sm font-bold disabled:opacity-40"
                              style={{ borderColor: 'var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--rustic-smoke)' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              disabled={item.quantity >= maxQty}
                              className="h-7 w-7 rounded-full border text-sm font-bold disabled:opacity-40"
                              style={{ borderColor: 'var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        {!unavailable && (
                          <span className="font-bold" style={{ color: 'var(--rustic-navy)' }}>
                            ${item.line_total.toFixed(2)}
                          </span>
                        )}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div
                className="mt-4 p-4"
                style={{
                  borderRadius: '18px',
                  background: 'var(--rustic-surface)',
                  boxShadow: '0 2px 16px rgba(44,24,16,0.07)',
                }}
              >
                <label className="rustic-section-label mb-2 block">Order Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => saveNotes(e.target.value)}
                  placeholder="e.g. Please slice the brisket"
                  rows={2}
                  className="w-full resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: 'var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
                />
                <label className="rustic-section-label mb-2 mt-3 block">Gift Message (optional)</label>
                <input
                  value={giftMessage}
                  onChange={e => saveGift(e.target.value)}
                  placeholder="e.g. Happy Purim!"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: 'var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
                />
              </div>
            </div>

            <div className="lg:w-72">
              <div
                className="sticky top-24 p-5"
                style={{
                  borderRadius: '18px',
                  background: 'var(--rustic-surface)',
                  boxShadow: '0 2px 16px rgba(44,24,16,0.07)',
                }}
              >
                <h2 className="rustic-section-label mb-4">Order Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--rustic-muted)' }}>Subtotal</span>
                    <span className="font-semibold" style={{ color: 'var(--rustic-smoke)' }}>
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--rustic-muted)' }}>Delivery</span>
                    <span style={{ color: 'var(--rustic-muted)' }}>Calculated at checkout</span>
                  </div>
                </div>
                <div
                  className="mt-3 flex justify-between border-t pt-3 font-bold"
                  style={{ borderColor: 'var(--rustic-rule)', color: 'var(--rustic-smoke)' }}
                >
                  <span>Total</span>
                  <span style={{ color: 'var(--rustic-ember)' }}>${subtotal.toFixed(2)}</span>
                </div>
                {hasOOS ? (
                  <button
                    type="button"
                    disabled
                    className="mt-4 block w-full cursor-not-allowed rounded-xl bg-gray-300 py-3 text-center font-bold text-white"
                  >
                    Remove unavailable items
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="mt-4 block w-full rounded-xl py-3 text-center font-bold text-white transition-opacity hover:opacity-95"
                    style={{ background: 'var(--rustic-ember)' }}
                  >
                    Proceed to Checkout
                  </Link>
                )}
                <Link
                  href="/"
                  className="mt-3 block text-center text-sm"
                  style={{ color: 'var(--rustic-muted)' }}
                >
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <StorefrontSignInModal
        open={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        supabase={supabase}
        title="Sign in to continue"
        description="Sign in to save your cart and order history."
      />
    </div>
  )
}
