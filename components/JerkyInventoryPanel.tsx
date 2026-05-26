'use client'

import { useEffect, useState } from 'react'
import {
  buildJerkyInventoryMaps,
  getJerkyFlavorStock,
  getJerkyFlavorThreshold,
  getJerkyFlavors,
  isJerkyFlavorLowStock,
} from '@/lib/jerky-stock'
import { patchProductInventory } from '@/lib/inventory-api'
import type { Product } from '@/types'

type Props = {
  product: Product
  onUpdate: (updated: Product) => void
  onError?: (message: string) => void
  t: {
    priceLabel: string
    descriptionLabel: string
    save: string
    inStock: string
    off: string
    visibleToCustomers: string
    hiddenFromCustomers: string
    outOfStock: string
    lowStock: string
    uploading: string
    changePhoto: string
    addPhoto: string
    flavor: string
    stockLbs: string
    threshold: string
    unavailable: string
  }
  uploading: string | null
  onUploadImage: (id: string, file: File) => void
  fileInputRef: (el: HTMLInputElement | null) => void
}

type EditField = { flavor: string; field: 'stock' | 'threshold' } | null

export default function JerkyInventoryPanel({
  product,
  onUpdate,
  onError,
  t,
  uploading,
  onUploadImage,
  fileInputRef,
}: Props) {
  const [saving, setSaving] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditField>(null)
  const [draftStock, setDraftStock] = useState('')
  const [draftThreshold, setDraftThreshold] = useState('')
  const initialMaps = buildJerkyInventoryMaps(product)
  const [localStock, setLocalStock] = useState(initialMaps.stock)
  const [localThresholds, setLocalThresholds] = useState(initialMaps.thresholds)

  const flavors = getJerkyFlavors(product)

  useEffect(() => {
    const maps = buildJerkyInventoryMaps(product)
    setLocalStock(maps.stock)
    setLocalThresholds(maps.thresholds)
  }, [product.id, product.jerky_flavor_stock, product.jerky_flavor_thresholds, product.stock_quantity])

  async function toggleStock() {
    const next = !product.is_in_stock
    const { product: updated, error } = await patchProductInventory(product.id, { is_in_stock: next })
    if (error) {
      onError?.(error)
      return
    }
    if (updated) onUpdate(updated)
  }

  async function toggleCustomerVisibility() {
    const next = product.is_customer_visible === false
    const { product: updated, error } = await patchProductInventory(product.id, {
      is_customer_visible: next,
    })
    if (error) {
      onError?.(error)
      return
    }
    if (updated) onUpdate(updated)
  }

  async function saveDetails(price: number, description: string | null) {
    setSaving('price')
    const { product: updated, error } = await patchProductInventory(product.id, {
      price,
      description: description?.trim() || null,
    })
    if (error) {
      onError?.(error)
      setSaving(null)
      return
    }
    if (updated) onUpdate(updated)
    setSaving(null)
  }

  async function saveFlavor(flavor: string, stock: number, threshold: number) {
    if (!Number.isFinite(stock) || stock < 0) {
      onError?.('Enter a valid stock amount (0 or more).')
      return
    }
    if (!Number.isFinite(threshold) || threshold < 0) {
      onError?.('Enter a valid low-stock threshold (0 or more).')
      return
    }

    setSaving(flavor)
    const previous = localStock[flavor] ?? 0
    const nextStock = { ...localStock, [flavor]: stock }
    const nextThresholds = { ...localThresholds, [flavor]: threshold }

    const { product: updated, error } = await patchProductInventory(
      product.id,
      {
        jerky_flavor_stock: nextStock,
        jerky_flavor_thresholds: nextThresholds,
      },
      {
        change_amount: stock - previous,
        previous_quantity: previous,
        new_quantity: stock,
        reason: `Manual stock update — ${flavor}`,
      },
    )

    if (error) {
      onError?.(error)
      setSaving(null)
      return
    }

    setLocalStock(nextStock)
    setLocalThresholds(nextThresholds)
    if (updated) {
      onUpdate(updated)
    } else {
      onUpdate({
        ...product,
        jerky_flavor_stock: nextStock,
        jerky_flavor_thresholds: nextThresholds,
      })
    }

    setSaving(null)
    setEditing(null)
  }

  function startEdit(flavor: string, field: 'stock' | 'threshold') {
    setEditing({ flavor, field })
    setDraftStock(String(localStock[flavor] ?? getJerkyFlavorStock(product, flavor)))
    setDraftThreshold(String(localThresholds[flavor] ?? getJerkyFlavorThreshold(product, flavor)))
  }

  return (
    <div className="col-span-1 rounded-xl border border-gray-100 bg-white p-4 sm:col-span-2 lg:col-span-3">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row">
        <div
          className="group relative flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-gray-100 sm:w-40 sm:flex-shrink-0"
          onClick={() => document.getElementById(`jerky-img-${product.id}`)?.click()}
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">🥩</span>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-sm font-semibold text-white">
              {uploading === product.id ? t.uploading : product.image_url ? `📷 ${t.changePhoto}` : `📷 ${t.addPhoto}`}
            </span>
          </div>
          <input
            id={`jerky-img-${product.id}`}
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) onUploadImage(product.id, file)
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{product.name}</p>
              <p className="text-xs text-gray-500">Per-flavor inventory (lbs)</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void toggleStock()}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                  product.is_in_stock ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {product.is_in_stock ? t.inStock : t.off}
              </button>
              <button
                type="button"
                onClick={() => void toggleCustomerVisibility()}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                  product.is_customer_visible === false ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {product.is_customer_visible === false ? t.hiddenFromCustomers : t.visibleToCustomers}
              </button>
            </div>
          </div>

          <div className="flex max-w-xs items-center gap-2">
            <span className="w-10 text-xs text-gray-400">{t.priceLabel}</span>
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={product.price}
                onChange={e => onUpdate({ ...product, price: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 py-1 pl-6 pr-2 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void saveDetails(product.price, product.description)}
              disabled={saving === 'price'}
              className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--navy)' }}
            >
              {saving === 'price' ? '...' : t.save}
            </button>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-gray-400">{t.descriptionLabel}</label>
            <textarea
              value={product.description ?? ''}
              onChange={e => onUpdate({ ...product, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">{t.flavor}</th>
              <th className="px-4 py-3">{t.stockLbs}</th>
              <th className="px-4 py-3">{t.threshold}</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">{t.save}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {flavors.map(flavor => {
              const stock = localStock[flavor] ?? 0
              const threshold = localThresholds[flavor] ?? getJerkyFlavorThreshold(product, flavor)
              const unavailable = stock <= 0
              const low = isJerkyFlavorLowStock(
                { ...product, jerky_flavor_stock: localStock, jerky_flavor_thresholds: localThresholds },
                flavor,
              )
              const isEditingStock = editing?.flavor === flavor && editing.field === 'stock'
              const isEditingThreshold = editing?.flavor === flavor && editing.field === 'threshold'

              return (
                <tr
                  key={flavor}
                  className={
                    unavailable ? 'bg-red-50' : low ? 'bg-yellow-50' : 'bg-white'
                  }
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{flavor}</td>
                  <td className="px-4 py-3">
                    {isEditingStock ? (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        autoFocus
                        value={draftStock}
                        onChange={e => setDraftStock(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            void saveFlavor(flavor, Number(draftStock), threshold)
                          }
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="w-24 rounded-lg border border-orange-300 px-2 py-1 text-sm focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(flavor, 'stock')}
                        className="rounded-lg border border-transparent px-2 py-1 font-bold text-gray-900 hover:border-orange-200 hover:bg-orange-50"
                      >
                        {stock.toFixed(1)} lb
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditingThreshold ? (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        autoFocus
                        value={draftThreshold}
                        onChange={e => setDraftThreshold(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            void saveFlavor(flavor, stock, Number(draftThreshold))
                          }
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="w-24 rounded-lg border border-orange-300 px-2 py-1 text-sm focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(flavor, 'threshold')}
                        className="rounded-lg border border-transparent px-2 py-1 text-gray-700 hover:border-orange-200 hover:bg-orange-50"
                      >
                        {threshold.toFixed(1)} lb
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {unavailable && (
                      <span className="text-xs font-bold uppercase text-red-600">{t.outOfStock}</span>
                    )}
                    {!unavailable && low && (
                      <span className="text-xs font-bold uppercase text-yellow-700">{t.lowStock}</span>
                    )}
                    {!unavailable && !low && (
                      <span className="text-xs text-gray-400">{t.inStock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={saving === flavor}
                      onClick={() =>
                        void saveFlavor(
                          flavor,
                          isEditingStock ? Number(draftStock) : stock,
                          isEditingThreshold ? Number(draftThreshold) : threshold,
                        )
                      }
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      style={{ background: 'var(--navy)' }}
                    >
                      {saving === flavor ? '...' : t.save}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
