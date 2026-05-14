'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Product, CartItem } from '@/types'
import Header from '@/components/Header'
import ProductModal from '@/components/ProductModal'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'jerky', label: 'Jerky' },
  { key: 'steaks', label: 'Steaks' },
  { key: 'smoked', label: 'Smoked' },
  { key: 'non_smoked', label: 'Non-Smoked' },
  { key: 'boards', label: 'Boards' },
]

function formatPrice(product: Product): string {
  switch (product.sold_as) {
    case 'per_lb': return `$${product.price}/lb`
    case 'per_pack': return `$${product.price}/pack`
    case 'per_pan': return `$${product.price}/pan`
    case 'per_board': return `$${product.price}`
    default: return `$${product.price}`
  }
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [user, setUser] = useState<any>(null)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('smoked-cart')
    if (stored) setCart(JSON.parse(stored))
    fetchProducts()
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('category')
    setProducts(data ?? [])
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
    const existing = cart.find(i => i.product_id === product.id && !i.selected_flavor)
    if (existing) {
      saveCart(cart.map(i => i.product_id === product.id && !i.selected_flavor
        ? { ...i, quantity: i.quantity + qty, line_total: (i.quantity + qty) * i.unit_price }
        : i))
    } else {
      const item: CartItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        price: product.price,
        quantity: qty,
        selected_flavor: null,
        selected_weight: null,
        selected_size: null,
        unit_price: product.price,
        line_total: product.price * qty,
        image_url: product.image_url,
      }
      saveCart([...cart, item])
    }
    showToast(`${product.name} added to cart`)
  }

  function addModalItem(item: CartItem) {
    const existing = cart.find(i =>
      i.product_id === item.product_id &&
      i.selected_flavor === item.selected_flavor &&
      i.selected_weight === item.selected_weight &&
      i.selected_size === item.selected_size
    )
    if (existing) {
      saveCart(cart.map(i => i.id === existing.id
        ? { ...i, quantity: i.quantity + item.quantity, line_total: (i.quantity + item.quantity) * i.unit_price }
        : i))
    } else {
      saveCart([...cart, item])
    }
    setSelectedProduct(null)
    showToast(`${item.product_name} added to cart`)
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const purimProducts = products.filter(p => p.is_featured_purim)
  const filtered = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory)

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.line_total, 0)

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Header cartCount={cartCount} cartTotal={cartTotal} user={user} onSignOut={() => supabase.auth.signOut()} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      {/* Purim Banner */}
      {purimProducts.length > 0 && (
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
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-8 pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
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

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-52 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-8 bg-gray-200 rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🥩</div>
            <p className="text-lg font-medium">No products yet</p>
            <p className="text-sm mt-1">Run the database seed step to add products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
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

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${!product.is_in_stock ? 'opacity-75' : ''}`}>
      <div className="h-52 bg-gray-100 flex items-center justify-center text-5xl relative">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <span>{product.category === 'jerky' ? '🥩' : product.category === 'boards' ? '🪵' : product.category === 'steaks' ? '🥩' : '🍖'}</span>
        }
        {!product.is_in_stock && (
          <div className="absolute top-3 left-3 bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded-full">
            Out of Stock
          </div>
        )}
        {product.is_featured_purim && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Purim Special
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h3>
        {product.size_label && (
          <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">{product.size_label}</span>
        )}
        {product.description && (
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold text-lg" style={{ color: 'var(--orange)' }}>
            {formatPrice(product)}
          </span>
          {product.is_in_stock ? (
            <button
              onClick={onAdd}
              className="text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: 'var(--navy)' }}
              onMouseOver={e => (e.currentTarget.style.background = '#243258')}
              onMouseOut={e => (e.currentTarget.style.background = 'var(--navy)')}
            >
              Add to Cart
            </button>
          ) : (
            <span className="text-gray-400 text-sm font-medium">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  )
}
