'use client'

import { useEffect, useState, useRef } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('category, name')
    setProducts(data ?? [])
    setLoading(false)
  }

  async function updateStock(id: string, qty: number) {
    setSaving(id)
    await supabase.from('products').update({ stock_quantity: qty }).eq('id', id)
    setProducts(ps => ps.map(p => p.id === id ? { ...p, stock_quantity: qty } : p))
    setSaving(null)
  }

  async function toggleStock(id: string, current: boolean) {
    await supabase.from('products').update({ is_in_stock: !current }).eq('id', id)
    setProducts(ps => ps.map(p => p.id === id ? { ...p, is_in_stock: !current } : p))
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

    await supabase.from('products').update({ image_url: publicUrl }).eq('id', id)
    setProducts(ps => ps.map(p => p.id === id ? { ...p, image_url: publicUrl } : p))
    setUploading(null)
  }

  const grouped = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  const categoryLabel = (c: string) => c.replace('_', '-').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--navy)' }}>Inventory</h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p>No products found. Run the seed data step first.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-8">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">{categoryLabel(cat)}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(p => {
                  const isLow = p.is_in_stock && p.stock_quantity <= p.low_stock_threshold
                  return (
                    <div key={p.id} className={`bg-white rounded-xl border p-4 ${
                      !p.is_in_stock ? 'border-red-200 bg-red-50' : isLow ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'
                    }`}>
                      {/* Image */}
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
                            {uploading === p.id ? 'Uploading...' : p.image_url ? '📷 Change Photo' : '📷 Add Photo'}
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

                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                          {!p.is_in_stock && <span className="text-xs text-red-600 font-bold">OUT OF STOCK</span>}
                          {isLow && <span className="text-xs text-yellow-700 font-bold">LOW STOCK</span>}
                        </div>
                        <button onClick={() => toggleStock(p.id, p.is_in_stock)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${p.is_in_stock ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {p.is_in_stock ? 'In Stock' : 'Off'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0"
                          value={p.stock_quantity}
                          onChange={e => setProducts(ps => ps.map(x => x.id === p.id ? { ...x, stock_quantity: Number(e.target.value) } : x))}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-orange-400"
                        />
                        <button onClick={() => updateStock(p.id, p.stock_quantity)}
                          disabled={saving === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-60"
                          style={{ background: 'var(--navy)' }}>
                          {saving === p.id ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  )
}
