'use client'

import { useEffect, useMemo, useState } from 'react'
import BossProductSheet from '@/components/BossProductSheet'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { collapseVariantProducts, getProductVariants } from '@/lib/product-display'
import type { BossLine, Order, OrderItem, Product } from '@/types'

type EditableItem = {
  id: string
  product_name: string
  quantity: number
  unit_price: number
}

type Props = {
  order: Order
  onUpdated: () => void
  useBossAuth?: boolean
}

function toEditable(item: OrderItem): EditableItem {
  return {
    id: item.id,
    product_name: item.product_name,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
  }
}

export default function PendingOrderItemsEditor({ order, onUpdated, useBossAuth = false }: Props) {
  const [editing, setEditing] = useState(false)
  const [editItems, setEditItems] = useState<EditableItem[]>([])
  const [newLines, setNewLines] = useState<BossLine[]>([])
  const [deliveryFee, setDeliveryFee] = useState(String(order.delivery_fee))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [showProductList, setShowProductList] = useState(false)
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    setEditItems((order.order_items ?? []).map(toEditable))
    setNewLines([])
    setDeliveryFee(String(order.delivery_fee))
    setEditing(false)
    setError('')
  }, [order.id, order.order_items, order.delivery_fee])

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    const visibleProducts = collapseVariantProducts(products)
    if (!q) return visibleProducts
    return visibleProducts.filter(
      p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    )
  }, [products, productSearch])

  async function loadProducts() {
    const res = useBossAuth
      ? await fetchWithAuth('/api/boss/catalog')
      : await fetch('/api/boss/catalog', { credentials: 'include' })
    const json = await res.json()
    if (res.ok) setProducts((json.products ?? []) as Product[])
  }

  function startEditing() {
    setEditItems((order.order_items ?? []).map(toEditable))
    setNewLines([])
    setDeliveryFee(String(order.delivery_fee))
    setError('')
    setEditing(true)
  }

  function updateQty(id: string, delta: number) {
    setEditItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item,
      ),
    )
  }

  function removeExisting(id: string) {
    setEditItems(items => items.filter(item => item.id !== id))
  }

  function removeNewLine(index: number) {
    setNewLines(lines => lines.filter((_, i) => i !== index))
  }

  async function saveEdits() {
    const kept = editItems.filter(item => item.quantity > 0)
    if (kept.length === 0 && newLines.length === 0) {
      setError('Order must have at least one item.')
      return
    }

    setSaving(true)
    setError('')

    const body = {
      orderId: order.id,
      items: editItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      newItems: newLines.map(line => ({
        product_id: line.product_id,
        product_name: line.product_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        selected_flavor: line.selected_flavor,
        selected_weight: line.selected_weight,
        selected_size: line.selected_size,
      })),
      deliveryFee: Number(deliveryFee),
      customAdjustment: Number(order.custom_adjustment ?? 0),
      customAdjustmentNote: order.custom_adjustment_note ?? '',
    }

    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }

    const res = useBossAuth
      ? await fetchWithAuth('/api/admin/orders/update', init)
      : await fetch('/api/admin/orders/update', { ...init, credentials: 'include' })

    const json = await res.json()
    setSaving(false)

    if (res.ok) {
      setEditing(false)
      onUpdated()
    } else {
      setError(json.error ?? 'Could not save changes')
    }
  }

  const previewSubtotal =
    editItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) +
    newLines.reduce((sum, line) => sum + line.line_total, 0)
  const previewTotal = previewSubtotal + Number(deliveryFee || 0) + Number(order.custom_adjustment ?? 0)

  if (order.status !== 'pending') return null

  return (
    <>
      <section className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-black">Items</h2>
          {!editing ? (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-xl border border-orange-200 px-3 py-1.5 text-sm font-bold text-orange-600"
            >
              Edit items
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm font-semibold text-gray-500"
            >
              Cancel
            </button>
          )}
        </div>

        {!editing ? (
          <div className="space-y-2">
            {(order.order_items ?? []).map(item => (
              <div key={item.id} className="flex justify-between border-b border-gray-50 py-2 last:border-0">
                <div className="min-w-0 pr-2">
                  <div className="font-bold">
                    {item.quantity}x {item.product_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {[item.selected_flavor, item.selected_weight && `${item.selected_weight} lb`, item.selected_size]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="shrink-0 font-black">${Number(item.line_total).toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {editItems.map(item => (
              <div key={item.id} className="rounded-xl border border-gray-100 p-2">
                <div className="mb-2 text-sm font-bold leading-tight">{item.product_name}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold"
                    >
                      −
                    </button>
                    <span className="min-w-[2rem] text-center font-black">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExisting(item.id)}
                    className="text-sm font-bold text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {newLines.map((line, index) => (
              <div key={`new-${index}`} className="rounded-xl border border-orange-100 bg-orange-50/50 p-2">
                <div className="mb-1 text-sm font-bold text-orange-800">{line.product_name}</div>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Qty {line.quantity} · ${line.line_total.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNewLine(index)}
                    className="font-bold text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                void loadProducts()
                setShowProductList(true)
              }}
              className="h-10 w-full rounded-xl border-2 border-dashed border-orange-300 text-sm font-bold text-orange-600"
            >
              + Add item
            </button>

            <label className="block text-xs font-bold text-gray-600">
              Delivery fee
              <input
                type="number"
                min="0"
                step="0.01"
                value={deliveryFee}
                onChange={e => setDeliveryFee(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
              />
            </label>

            <div className="flex justify-between text-sm font-bold">
              <span>New total</span>
              <span className="text-orange-600">${previewTotal.toFixed(2)}</span>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEdits()}
              className="h-11 w-full rounded-xl text-sm font-black text-white disabled:opacity-60"
              style={{ background: 'var(--navy)' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}
      </section>

      {showProductList && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 p-3">
            <button type="button" onClick={() => setShowProductList(false)} className="text-sm font-bold text-gray-600">
              ← Back
            </button>
            <input
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Search products…"
              className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  setPickerProduct(product)
                  setShowProductList(false)
                }}
                className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-left"
              >
                <span className="font-bold">{product.name}</span>
                <span className="text-sm text-gray-600">${product.price}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <BossProductSheet
        product={pickerProduct}
        sizeVariants={pickerProduct ? getProductVariants(pickerProduct, products) : []}
        onClose={() => setPickerProduct(null)}
        onAdd={line => {
          setNewLines(lines => [...lines, line])
          setPickerProduct(null)
          setEditing(true)
        }}
      />
    </>
  )
}
