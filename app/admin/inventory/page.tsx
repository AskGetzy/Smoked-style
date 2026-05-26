'use client'

import { useEffect, useState, useRef } from 'react'
import AdminLayout from '@/components/AdminLayout'
import JerkyInventoryPanel from '@/components/JerkyInventoryPanel'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { patchProductInventory } from '@/lib/inventory-api'
import { useLanguage } from '@/lib/language-context'
import { productCategoryLabel } from '@/lib/i18n'
import type { Product } from '@/types'

export default function InventoryPage() {
  const { t } = useLanguage()
  const [supabase] = useState(() => createBrowserSupabaseClient())
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { void fetchProducts() }, [supabase])

  async function fetchProducts() {
    const { data, error } = await supabase.from('products').select('*').order('category, name')
    if (error) setSaveError(error.message)
    setProducts(data ?? [])
    setLoading(false)
  }

  function updateProductInState(updated: Product) {
    setProducts(ps => ps.map(p => (p.id === updated.id ? updated : p)))
  }

  async function updateProduct(product: Product) {
    setSaving(product.id)
    setSaveError(null)
    const { product: updated, error } = await patchProductInventory(product.id, {
      stock_quantity: product.stock_quantity,
      price: product.price,
      description: product.description?.trim() || null,
    })
    if (error) {
      setSaveError(error)
      setSaving(null)
      return
    }
    if (updated) updateProductInState(updated)
    setSaving(null)
  }

  async function toggleStock(id: string, current: boolean) {
    setSaveError(null)
    const { product, error } = await patchProductInventory(id, { is_in_stock: !current })
    if (error) {
      setSaveError(error)
      return
    }
    if (product) updateProductInState(product)
  }

  async function toggleCustomerVisibility(id: string, current: boolean) {
    setSaveError(null)
    const { product, error } = await patchProductInventory(id, { is_customer_visible: !current })
    if (error) {
      setSaveError(error)
      return
    }
    if (product) updateProductInState(product)
  }

  async function uploadImage(id: string, file: File) {
    setUploading(id)
    const ext = file.name.split('.').pop()
    const path = `${id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploading(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    const { product, error } = await patchProductInventory(id, { image_url: publicUrl })
    if (error) {
      setSaveError(error)
      setUploading(null)
      return
    }
    if (product) updateProductInState(product)
    setUploading(null)
  }

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  const jerkyLabels = {
    priceLabel: t.priceLabel,
    descriptionLabel: t.descriptionLabel,
    save: t.save,
    inStock: t.inStock,
    off: t.off,
    visibleToCustomers: t.visibleToCustomers,
    hiddenFromCustomers: t.hiddenFromCustomers,
    outOfStock: t.outOfStock,
    lowStock: t.lowStock,
    uploading: t.uploading,
    changePhoto: t.changePhoto,
    addPhoto: t.addPhoto,
    flavor: t.flavor,
    stockLbs: t.stockLbs,
    threshold: t.threshold,
    unavailable: t.unavailable,
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--navy)' }}>{t.inventory}</h1>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.searchProductsPlaceholder}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-6 focus:outline-none focus:border-orange-400"
        />

        {saveError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {saveError}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p>{t.noProductsFound}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-8">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">{productCategoryLabel(t, cat)}</h2>

              {cat === 'jerky' ? (
                <div className="grid grid-cols-1 gap-3">
                  {items.map(p => (
                    <JerkyInventoryPanel
                      key={p.id}
                      product={p}
                      onUpdate={updated => {
                        setSaveError(null)
                        updateProductInState(updated)
                      }}
                      onError={setSaveError}
                      t={jerkyLabels}
                      uploading={uploading}
                      onUploadImage={uploadImage}
                      fileInputRef={el => { fileRefs.current[p.id] = el }}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(p => {
                    const isLow = p.is_in_stock && p.stock_quantity <= p.low_stock_threshold
                    const customerVisible = p.is_customer_visible !== false
                    return (
                      <div key={p.id} className={`bg-white rounded-xl border p-4 ${
                        !p.is_in_stock ? 'border-red-200 bg-red-50' : isLow ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'
                      }`}>
                        <div
                          className="w-full h-36 rounded-lg mb-3 overflow-hidden relative group cursor-pointer bg-gray-100 flex items-center justify-center"
                          onClick={() => fileRefs.current[p.id]?.click()}
                        >
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">🥩</span>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <span className="text-white text-sm font-semibold">
                              {uploading === p.id ? t.uploading : p.image_url ? `📷 ${t.changePhoto}` : `📷 ${t.addPhoto}`}
                            </span>
                          </div>
                          <input
                            ref={el => { fileRefs.current[p.id] = el }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) uploadImage(p.id, file)
                            }}
                          />
                        </div>

                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{p.name}{p.size_label ? ` — ${p.size_label}` : ''}</p>
                            {!p.is_in_stock && <span className="text-xs text-red-600 font-bold">{t.outOfStock.toUpperCase()}</span>}
                            {isLow && <span className="text-xs text-yellow-700 font-bold">{t.lowStock.toUpperCase()}</span>}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => toggleStock(p.id, p.is_in_stock)}
                              className={`rounded-lg px-2 py-1 text-xs font-semibold ${p.is_in_stock ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                            >
                              {p.is_in_stock ? t.inStock : t.off}
                            </button>
                            <button
                              onClick={() => toggleCustomerVisibility(p.id, customerVisible)}
                              className={`rounded-lg px-2 py-1 text-xs font-semibold ${customerVisible ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}
                            >
                              {customerVisible ? t.visibleToCustomers : t.hiddenFromCustomers}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-10">{t.priceLabel}</span>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                type="number" min="0" step="1"
                                value={p.price}
                                onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, price: Number(e.target.value) } : x))}
                                className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-1 text-sm focus:outline-none focus:border-orange-400"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-10">{t.stockLabel}</span>
                            <input
                              type="number" min="0"
                              value={p.stock_quantity}
                              onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, stock_quantity: Number(e.target.value) } : x))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-orange-400"
                            />
                            <button onClick={() => updateProduct(p)}
                              disabled={saving === p.id}
                              className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-60 flex-shrink-0"
                              style={{ background: 'var(--navy)' }}>
                              {saving === p.id ? '...' : t.save}
                            </button>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">{t.descriptionLabel}</label>
                            <textarea
                              value={p.description ?? ''}
                              onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, description: e.target.value } : x))}
                              rows={3}
                              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  )
}
