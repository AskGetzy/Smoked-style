'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import type { CartItem } from '@/types'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'

export default function CartPage() {
  const supabase = createBrowserSupabaseClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('smoked-cart')
    if (stored) setCart(JSON.parse(stored))
    const n = localStorage.getItem('smoked-notes')
    if (n) setNotes(n)
    const g = localStorage.getItem('smoked-gift')
    if (g) setGiftMessage(g)
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

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
    const updated = cart.map(i => {
      if (i.id !== id) return i
      const newQty = Math.max(1, i.quantity + delta)
      return { ...i, quantity: newQty, line_total: newQty * i.unit_price }
    })
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

  const subtotal = cart.reduce((s, i) => s + i.line_total, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const hasOOS = false

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
        onSignIn={signInWithGoogle}
        onSignOut={() => supabase.auth.signOut()}
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
            {/* Items */}
            <div className="flex-1">
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                {cart.map(item => (
                  <div key={item.id} className="p-4 flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover rounded-xl" />
                        : '🥩'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{itemLabel(item)}</p>
                      <p className="text-gray-500 text-xs mt-0.5">${item.unit_price.toFixed(2)} each</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50">−</button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50">+</button>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="font-bold text-gray-900">${item.line_total.toFixed(2)}</span>
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
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

            {/* Summary */}
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
                <Link
                  href="/checkout"
                  className="block w-full text-center text-white font-bold py-3 rounded-xl mt-4 transition-colors"
                  style={{ background: 'var(--navy)' }}
                >
                  Proceed to Checkout
                </Link>
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
