'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabaseUser } from '@/lib/use-supabase-user'
import type { Product, CartItem } from '@/types'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import ProductModal from '@/components/ProductModal'
import { formatPrice, getBoardVariants } from '@/lib/product-display'
import {
  clampLineQuantity,
  formatStockLeft,
  getMaxLineQuantity,
  isOutOfStock,
} from '@/lib/product-stock'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'jerky', label: 'Jerky' },
  { key: 'steaks', label: 'Steaks' },
  { key: 'smoked', label: 'Smoked' },
  { key: 'non_smoked', label: 'Non-Smoked' },
  { key: 'boards', label: 'Boards' },
]

export default function CatalogPage() {
  const { user, authReady, supabase } = useSupabaseUser()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('smoked-cart')
    if (stored) setCart(JSON.parse(stored))
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category')

    if (error) {
      console.error('Failed to load products', error)
      showToast('Could not load products. Please refresh.')
      setProducts([])
    } else {
      setProducts(data ?? [])
    }
    setLoading(false)
  }

  function saveCart(items: CartItem[]) {
    setCart(items)
    localStorage.setItem('smoked-cart', JSON.stringify(items))
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleAddToCart(product: Product) {
    if (isOutOfStock(product)) return
    if (!user) {
      setPendingProduct(product)
      setShowSignInModal(true)
      return
    }
    if (product.category === 'jerky' || product.category === 'boards' ||
        product.category === 'steaks' || product.sold_as !== 'per_piece') {
      setSelectedProduct(product)
    } else {
      addSimpleItem(product, 1)
    }
  }

  function addSimpleItem(product: Product, qty: number) {
    const lineKey = { product_id: product.id }
    const addQty = clampLineQuantity(product, cart, lineKey, qty)
    if (addQty <= 0) {
      showToast(`Only ${getMaxLineQuantity(product, cart, lineKey)} left in stock`)
      return
    }

    const existing = cart.find(i => i.product_id === product.id && !i.selected_flavor)
    if (existing) {
      const newQty = clampLineQuantity(
        product,
        cart,
        lineKey,
        existing.quantity + addQty,
        existing.id,
      )
      if (newQty <= existing.quantity) {
        showToast(formatStockLeft(product, getMaxLineQuantity(product, cart, lineKey, existing.id)) ?? 'Out of stock')
        return
      }
      saveCart(cart.map(i => i.product_id === product.id && !i.selected_flavor
        ? { ...i, quantity: newQty, line_total: newQty * i.unit_price }
        : i))
    } else {
      const item: CartItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        price: product.price,
        quantity: addQty,
        selected_flavor: null,
        selected_weight: null,
        selected_size: null,
        unit_price: product.price,
        line_total: product.price * addQty,
        image_url: product.image_url,
      }
      saveCart([...cart, item])
    }
    showToast(`${product.name} added to cart`)
  }

  function addModalItem(item: CartItem) {
    if (!user) {
      setPendingProduct(selectedProduct)
      setShowSignInModal(true)
      return
    }

    const product = products.find(p => p.id === item.product_id)
    if (!product) return

    const lineKey = {
      product_id: item.product_id,
      selected_flavor: item.selected_flavor,
      selected_weight: item.selected_weight,
      selected_size: item.selected_size,
    }

    let nextItem = item
    if (product.category === 'jerky') {
      const weight = item.selected_weight ?? 0
      const allowedWeight = clampLineQuantity(product, cart, lineKey, weight)
      if (allowedWeight <= 0) {
        showToast(formatStockLeft(product, getMaxLineQuantity(product, cart, lineKey)) ?? 'Out of stock')
        return
      }
      if (allowedWeight !== weight) {
        nextItem = {
          ...item,
          selected_weight: allowedWeight,
          unit_price: product.price * allowedWeight,
          line_total: product.price * allowedWeight,
        }
      }
    } else {
      const allowedQty = clampLineQuantity(product, cart, lineKey, item.quantity)
      if (allowedQty <= 0) {
        showToast(formatStockLeft(product, getMaxLineQuantity(product, cart, lineKey)) ?? 'Out of stock')
        return
      }
      if (allowedQty !== item.quantity) {
        nextItem = {
          ...item,
          quantity: allowedQty,
          line_total: allowedQty * item.unit_price,
        }
      }
    }

    const existing = cart.find(i =>
      i.product_id === nextItem.product_id &&
      i.selected_flavor === nextItem.selected_flavor &&
      i.selected_weight === nextItem.selected_weight &&
      i.selected_size === nextItem.selected_size
    )
    if (existing) {
      const mergedQty = existing.quantity + nextItem.quantity
      const cappedQty = clampLineQuantity(product, cart, lineKey, mergedQty, existing.id)
      if (cappedQty <= existing.quantity) {
        showToast(formatStockLeft(product, getMaxLineQuantity(product, cart, lineKey, existing.id)) ?? 'Out of stock')
        return
      }
      saveCart(cart.map(i => i.id === existing.id
        ? { ...i, quantity: cappedQty, line_total: cappedQty * i.unit_price }
        : i))
    } else {
      saveCart([...cart, nextItem])
    }
    setSelectedProduct(null)
    showToast(`${nextItem.product_name} added to cart`)
  }

  function openProduct(product: Product) {
    setSelectedProduct(product)
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    })
    if (error) {
      showToast(error.message)
    }
  }

  const searchQuery = searchTerm.trim().toLowerCase()
  const isSearching = searchQuery.length > 0
  const purimProducts = products.filter(p => p.is_featured_purim)
  const filtered = isSearching
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery) ||
        (p.description ?? '').toLowerCase().includes(searchQuery)
      )
    : activeCategory === 'all'
      ? products
      : products.filter(p => p.category === activeCategory)

  const displayProducts =
    activeCategory === 'all' && !isSearching
      ? [...filtered].sort((a, b) => a.price - b.price)
      : filtered

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.line_total, 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        user={user}
        authReady={authReady}
        onSignIn={signInWithGoogle}
        onSignOut={() => void supabase.auth.signOut()}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div
        className="sticky top-16 z-30 border-b border-orange-100 px-4 py-3"
        style={{ background: 'var(--cream)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="relative w-full md:max-w-2xl md:mx-auto">
            <SearchIcon />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search for smoked meats, jerky, boards..."
              className="w-full h-12 rounded-2xl border border-gray-300 bg-white pl-12 pr-12 text-base text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              type="search"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
                type="button"
              >
                <ClearIcon />
              </button>
            )}
          </div>

          {!isSearching && (
            <div className="-mx-4 mt-3 overflow-x-auto scrollbar-hide px-4">
              <div className="flex min-w-max gap-2 pb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex-shrink-0 min-h-12 px-5 py-2 rounded-full text-base sm:text-sm font-semibold transition-all ${
                      activeCategory === cat.key
                        ? 'text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                    }`}
                    style={activeCategory === cat.key ? { background: 'var(--navy)' } : {}}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purim Banner */}
      {!isSearching && purimProducts.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 py-6 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-amber-800 mb-1">🎉 Purim Special</h2>
            <p className="text-amber-700 text-sm mb-4">Limited time seasonal offerings</p>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {purimProducts.map(p => (
                <div key={p.id} className="flex-shrink-0 bg-white rounded-xl p-4 border border-amber-200 w-48">
                  <div className="w-full h-28 bg-amber-100 rounded-lg mb-3 flex items-center justify-center text-3xl">🥩</div>
                  <div className="font-semibold text-sm text-gray-800">{p.name}</div>
                  <div className="text-amber-700 font-bold text-sm mt-1">{formatPrice(p)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-8 bg-gray-200 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🥩</div>
            <p className="text-lg font-medium">
              {isSearching ? `No products found for "${searchTerm.trim()}"` : 'No products yet'}
            </p>
            <p className="text-sm mt-1">
              {isSearching ? 'Try a different search or clear it to browse categories.' : 'Run the database seed step to add products.'}
            </p>
          </div>
        ) : (
          <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={() => openProduct(product)}
                onAdd={() => handleAddToCart(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          cart={cart}
          sizeVariants={getBoardVariants(selectedProduct, products)}
          onClose={() => setSelectedProduct(null)}
          onAdd={addModalItem}
        />
      )}

      {/* Sign In Modal */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to add to cart</h3>
            <p className="text-gray-500 text-sm mb-6">We use Google Sign In to save your cart and order history.</p>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-3"
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>
            <button onClick={() => setShowSignInModal(false)} className="text-sm text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

