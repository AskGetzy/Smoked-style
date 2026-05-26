'use client'

import { useEffect, useMemo, useState } from 'react'
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
  { key: 'all', label: 'All Cuts', icon: '✦', description: 'Everything from the smokehouse' },
  { key: 'jerky', label: 'Jerky', icon: '◌', description: 'Bold flavor, sliced thin' },
  { key: 'steaks', label: 'Steaks', icon: '◇', description: 'Premium cuts for the grill' },
  { key: 'smoked', label: 'Smoked', icon: '≈', description: 'Low and slow favorites' },
  { key: 'non_smoked', label: 'Fresh Cuts', icon: '○', description: 'Clean, butcher-ready picks' },
  { key: 'boards', label: 'Boards', icon: '▣', description: 'Ready-to-serve grazing boards' },
] as const

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
    void fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data, error } = await supabase.from('products').select('*').order('category')

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
    if (
      product.category === 'jerky' ||
      product.category === 'boards' ||
      product.category === 'steaks' ||
      product.sold_as !== 'per_piece'
    ) {
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
        showToast(
          formatStockLeft(product, getMaxLineQuantity(product, cart, lineKey, existing.id)) ??
            'Out of stock',
        )
        return
      }
      saveCart(
        cart.map(i =>
          i.product_id === product.id && !i.selected_flavor
            ? { ...i, quantity: newQty, line_total: newQty * i.unit_price }
            : i,
        ),
      )
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

    const existing = cart.find(
      i =>
        i.product_id === nextItem.product_id &&
        i.selected_flavor === nextItem.selected_flavor &&
        i.selected_weight === nextItem.selected_weight &&
        i.selected_size === nextItem.selected_size,
    )
    if (existing) {
      const mergedQty = existing.quantity + nextItem.quantity
      const cappedQty = clampLineQuantity(product, cart, lineKey, mergedQty, existing.id)
      if (cappedQty <= existing.quantity) {
        showToast(
          formatStockLeft(product, getMaxLineQuantity(product, cart, lineKey, existing.id)) ??
            'Out of stock',
        )
        return
      }
      saveCart(
        cart.map(i =>
          i.id === existing.id
            ? { ...i, quantity: cappedQty, line_total: cappedQty * i.unit_price }
            : i,
        ),
      )
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
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) showToast(error.message)
  }

  const searchQuery = searchTerm.trim().toLowerCase()
  const isSearching = searchQuery.length > 0
  const purimProducts = products.filter(p => p.is_featured_purim)
  const filtered = isSearching
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(searchQuery) ||
          (p.description ?? '').toLowerCase().includes(searchQuery),
      )
    : activeCategory === 'all'
      ? products
      : products.filter(p => p.category === activeCategory)

  const displayProducts =
    activeCategory === 'all' && !isSearching ? [...filtered].sort((a, b) => a.price - b.price) : filtered

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.line_total, 0)
  const categoryCounts = useMemo(
    () =>
      products.reduce<Record<string, number>>((acc, product) => {
        acc[product.category] = (acc[product.category] ?? 0) + 1
        return acc
      }, {}),
    [products],
  )
  const activeCategoryData =
    CATEGORIES.find(category => category.key === activeCategory) ?? CATEGORIES[0]
  const totalCategories = CATEGORIES.length - 1

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,168,75,0.16),transparent_28%),linear-gradient(180deg,#fbf5ea_0%,#f7efe0_52%,#f5ecde_100%)]">
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        user={user}
        authReady={authReady}
        onSignIn={signInWithGoogle}
        onSignOut={() => void supabase.auth.signOut()}
      />

      {toast && (
        <div className="fixed right-4 top-24 z-50 max-w-xs rounded-2xl border border-emerald-700/30 bg-[linear-gradient(135deg,#224233,#173427)] px-4 py-3 text-sm font-semibold text-emerald-50 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs">
              ✓
            </span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      <main className="pb-16">
        <section className="px-4 pb-8 pt-6">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(26,39,68,0.98),rgba(44,28,18,0.96))] p-7 text-white shadow-[0_30px_80px_rgba(38,24,15,0.18)] sm:p-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-white/80">
                <span className="text-[10px]" style={{ color: 'var(--gold)' }}>
                  ●
                </span>
                Smoked Style Smokehouse
              </div>
              <h1 className="max-w-2xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
                Rustic cuts, slow smoke, and a storefront with a little more soul.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                Browse premium jerky, steaks, smoked favorites, and handcrafted boards in a
                warmer market-style layout built for quick shopping and richer product discovery.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('all')
                    setSearchTerm('')
                  }}
                  className="rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5"
                >
                  Browse the full counter
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('smoked')}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Shop smoked favorites
                </button>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <CatalogStat label="Cuts available" value={String(products.length)} />
                <CatalogStat label="Seasonal specials" value={String(purimProducts.length)} />
                <CatalogStat label="Items in cart" value={String(cartCount)} />
              </div>
            </div>

            <aside className="rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,251,245,0.94),rgba(247,238,223,0.98))] p-6 shadow-[0_18px_60px_rgba(68,44,24,0.10)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
                Today&apos;s counter
              </div>
              <h2 className="mt-3 font-serif text-2xl font-bold text-stone-900">
                {isSearching ? `Results for “${searchTerm.trim()}”` : activeCategoryData.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {isSearching
                  ? `${displayProducts.length} product${displayProducts.length === 1 ? '' : 's'} matched your search.`
                  : activeCategoryData.description}
              </p>
              <div className="mt-6 space-y-3">
                <QuickFact
                  label="Categories on the counter"
                  value={String(totalCategories)}
                  note="From jerky to grazing boards"
                />
                <QuickFact
                  label="Visible right now"
                  value={String(displayProducts.length)}
                  note={isSearching ? 'Live filtered search results' : 'Products in this section'}
                />
                <QuickFact
                  label="Featured specials"
                  value={String(purimProducts.length)}
                  note="Seasonal showcase when available"
                />
              </div>
            </aside>
          </div>
        </section>

        <section className="sticky top-20 z-30 border-y border-stone-200/70 bg-[rgba(251,246,236,0.88)] px-4 py-4 backdrop-blur-lg">
          <div className="mx-auto max-w-6xl">
            <div className="relative">
              <SearchIcon />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search jerky, steaks, smoked platters, boards..."
                className="h-14 w-full rounded-[1.25rem] border border-stone-300/80 bg-white/95 pl-12 pr-12 text-base text-stone-900 shadow-[0_8px_30px_rgba(40,28,18,0.08)] outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                type="search"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                  aria-label="Clear search"
                  type="button"
                >
                  <ClearIcon />
                </button>
              )}
            </div>

            {!isSearching && (
              <div className="-mx-4 mt-4 overflow-x-auto scrollbar-hide px-4">
                <div className="flex min-w-max gap-2 pb-1">
                  {CATEGORIES.map(category => (
                    <button
                      key={category.key}
                      onClick={() => setActiveCategory(category.key)}
                      className={`group flex min-h-12 flex-shrink-0 items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                        activeCategory === category.key
                          ? 'border-stone-900 text-white shadow-[0_8px_24px_rgba(29,21,15,0.18)]'
                          : 'border-stone-200/90 bg-white/90 text-stone-700 hover:border-orange-300 hover:bg-white'
                      }`}
                      style={
                        activeCategory === category.key
                          ? { background: 'linear-gradient(135deg, #1a2744, #332118)' }
                          : undefined
                      }
                    >
                      <span
                        className={`text-sm ${
                          activeCategory === category.key ? 'text-amber-300' : 'text-stone-400'
                        }`}
                      >
                        {category.icon}
                      </span>
                      <span>{category.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          activeCategory === category.key
                            ? 'bg-white/10 text-white/80'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {category.key === 'all'
                          ? products.length
                          : categoryCounts[category.key] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {!isSearching && purimProducts.length > 0 && (
          <section className="px-4 pt-8">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-amber-200/70 bg-[linear-gradient(135deg,#fff5d8,#faecc2_55%,#f6e1b2)] p-6 shadow-[0_18px_50px_rgba(166,116,31,0.10)] sm:p-8">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-800/80">
                    Seasonal feature
                  </div>
                  <h2 className="mt-2 font-serif text-3xl font-bold text-amber-950">
                    Purim specials from the smokehouse
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/80">
                    Limited-run favorites presented up front so customers can jump straight into
                    the most festive offerings.
                  </p>
                </div>
                <div className="rounded-full border border-amber-900/10 bg-white/50 px-4 py-2 text-sm font-semibold text-amber-900">
                  {purimProducts.length} special{purimProducts.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {purimProducts.slice(0, 3).map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProduct(product)}
                    className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800">
                        Purim Special
                      </span>
                      <span className="text-sm font-bold text-amber-900">{formatPrice(product)}</span>
                    </div>
                    <div className="text-lg font-bold text-stone-900">{product.name}</div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
                      {product.description || 'A seasonal smoked favorite from the current counter.'}
                    </p>
                    <div className="mt-4 text-sm font-semibold text-amber-900">View details</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
                  Browse products
                </div>
                <h2 className="mt-2 font-serif text-3xl font-bold text-stone-900">
                  {isSearching ? 'Search results' : activeCategoryData.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {isSearching
                    ? `Showing ${displayProducts.length} result${displayProducts.length === 1 ? '' : 's'} for “${searchTerm.trim()}”.`
                    : activeCategory === 'all'
                      ? 'A full view of the current counter, sorted from lighter price points upward.'
                      : activeCategoryData.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ResultPill label="Products" value={String(displayProducts.length)} />
                <ResultPill label="Cart total" value={`$${cartTotal.toFixed(2)}`} />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/70 shadow-[0_18px_60px_rgba(54,34,19,0.08)]"
                  >
                    <div className="h-56 animate-pulse bg-gradient-to-br from-stone-200 to-stone-300" />
                    <div className="space-y-3 p-5">
                      <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
                      <div className="h-6 w-2/3 animate-pulse rounded-full bg-stone-300" />
                      <div className="h-3 w-full animate-pulse rounded-full bg-stone-200" />
                      <div className="h-12 animate-pulse rounded-2xl bg-stone-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="rounded-[2rem] border border-stone-200/70 bg-white/75 px-6 py-16 text-center shadow-[0_18px_60px_rgba(54,34,19,0.08)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-2xl text-stone-500">
                  ⌕
                </div>
                <h3 className="mt-5 font-serif text-3xl font-bold text-stone-900">
                  {isSearching ? `No results for “${searchTerm.trim()}”` : 'No products yet'}
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600">
                  {isSearching
                    ? 'Try a broader term, clear the search, or switch back to category browsing to explore the full counter.'
                    : 'Run the seed step to stock the catalog and bring the storefront to life.'}
                </p>
                {isSearching && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="mt-6 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
        </section>
      </main>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          cart={cart}
          sizeVariants={getBoardVariants(selectedProduct, products)}
          onClose={() => setSelectedProduct(null)}
          onAdd={addModalItem}
        />
      )}

      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,14,9,0.72)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-100/50 bg-[linear-gradient(180deg,#fff9ef,#f5e8d4)] shadow-[0_30px_80px_rgba(24,16,10,0.35)]">
            <div className="border-b border-stone-200/70 px-7 py-6">
              <div className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-100/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-900">
                Guest checkout note
              </div>
              <h3 className="mt-4 font-serif text-3xl font-bold text-stone-900">
                Sign in before adding to cart
              </h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                We use Google Sign In to save your cart and order history so your selections are
                waiting for you when you come back.
              </p>
              {pendingProduct && (
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-stone-700">
                  Ready to add: <span className="font-bold text-stone-900">{pendingProduct.name}</span>
                </div>
              )}
            </div>

            <div className="px-7 py-6">
              <button
                onClick={signInWithGoogle}
                className="mb-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 py-3.5 font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </button>
              <button
                onClick={() => setShowSignInModal(false)}
                className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-semibold text-stone-500 transition hover:bg-white/60 hover:text-stone-700"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CatalogStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/10 px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/60">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
    </div>
  )
}

function QuickFact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/70 bg-white/55 px-4 py-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-500">
            {label}
          </div>
          <div className="mt-2 text-2xl font-black text-stone-900">{value}</div>
        </div>
        <div className="text-lg" style={{ color: 'var(--gold)' }}>
          ❦
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-600">{note}</p>
    </div>
  )
}

function ResultPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-stone-200/70 bg-white/80 px-4 py-2 text-sm text-stone-600 shadow-sm">
      <span className="font-semibold text-stone-500">{label}: </span>
      <span className="font-bold text-stone-900">{value}</span>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
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

