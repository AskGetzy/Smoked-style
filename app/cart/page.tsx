'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import type { CartItem, Product } from '@/types'
import { useSupabaseUser } from '@/lib/use-supabase-user'
import { getMaxLineQuantity, isOutOfStock } from '@/lib/product-stock'

export default function CartPage() {
  const { user, authReady, supabase } = useSupabaseUser()
  const [cart, setCart] = useState<CartItem[]>([])
  const [productsById, setProductsById] = useState<Map<string, Product>>(new Map())
  const [notes, setNotes] = useState('')
  const [giftMessage, setGiftMessage] = useState('')

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
      return
    }

    let cancelled = false

    async function loadProducts() {
      const { data } = await supabase
        .from('products')
        .select('id, name, category, price, sold_as, flavors, weight_options, pack_size, size_label, stock_quantity, is_in_stock, image_url')
        .in('id', productIds)

      if (cancelled) return

      const map = new Map<string, Product>()
      for (const p of data ?? []) {
        map.set(p.id, p as Product)
      }
      setProductsById(map)
    }

    void loadProducts()
    return () => { cancelled = true }
  }, [supabase, productIds])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  function saveCart(items: CartItem[]) {
    setCart(items)
    localStorage.setItem('smoked-cart', JSON.stringify(items))
  }

  function updateQty(id: string, delta: number) {
    const item = cart.find(i => i.id === id)
    if (!item) return
    const product = productsById.get(item.product_id)
    if (!product || product.category === 'jerky') return

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

  function itemIsOutOfStock(item: CartItem): boolean {
    const product = productsById.get(item.product_id)
    if (!product) return false
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
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Header
        cartCount={cartCount}
        cartTotal={subtotal}
        user={user}
        authReady={authReady}
        onSignIn={signInWithGoogle}
        onSignOut={() => void supabase.auth.signOut()}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--navy)' }}>Your Cart</h1>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-500 text-lg mb-6">Your cart is empty</p>
            <Link href="/" className="inline-block text-white font-semibold px-6 py-3 rounded-xl" style={{ background: 'var(--navy)' }}>
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

              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                {cart.map(item => {
                  const unavailable = itemIsOutOfStock(item)
                  return (
                    <div
                      key={item.id}
                      className={`p-4 flex gap-4 ${unavailable ? 'bg-red-50 border-l-4 border-red-400' : ''}`}
                    >
                      <div className={`w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${unavailable ? 'opacity-60 grayscale' : ''}`}>
                        {item.image_url
                          ? <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover rounded-xl" />
                          : '🥩'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{itemLabel(item)}</p>
                        {unavailable ? (
                          <p className="text-red-600 text-xs font-semibold mt-1">This item is no longer available</p>
                        ) : (
                          <p className="text-gray-500 text-xs mt-0.5">${item.unit_price.toFixed(2)} each</p>
                        )}
                        {!unavailable && productsById.get(item.product_id)?.category !== 'jerky' && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 rounded-full border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              disabled={
                                item.quantity >= getMaxLineQuantity(
                                  productsById.get(item.product_id)!,
                                  cart,
                                  {
                                    product_id: item.product_id,
                                    selected_flavor: item.selected_flavor,
                                    selected_weight: item.selected_weight,
                                    selected_size: item.selected_size,
                                  },
                                  item.id,
                                )
                              }
                              className="w-7 h-7 rounded-full border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        {!unavailable && (
                          <span className="font-bold text-gray-900">${item.line_total.toFixed(2)}</span>
                        )}
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Order Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => saveNotes(e.target.value)}
                  placeholder="e.g. Please slice the brisket"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
                />
                <label className="block text-sm font-semibold text-gray-700 mb-2 mt-3">Gift Message (optional)</label>
                <input
                  value={giftMessage}
                  onChange={e => saveGift(e.target.value)}
                  placeholder="e.g. Happy Purim!"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div className="lg:w-72">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
                <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery</span>
                    <span className="text-gray-500">Calculated at checkout</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span style={{ color: 'var(--orange)' }}>${subtotal.toFixed(2)}</span>
                </div>
                {hasOOS ? (
                  <button
                    type="button"
                    disabled
                    className="block w-full text-center text-white font-bold py-3 rounded-xl mt-4 bg-gray-300 cursor-not-allowed"
                  >
                    Remove unavailable items
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="block w-full text-center text-white font-bold py-3 rounded-xl mt-4 transition-colors"
                    style={{ background: 'var(--navy)' }}
                  >
                    Proceed to Checkout
                  </Link>
                )}
                <Link href="/" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-3">
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
