'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Customer, DeliveryArea, Product } from '@/types'
import BossPlaceOrderModal, { type BossPlaceOrderPayload } from '@/components/BossPlaceOrderModal'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { todayLocal } from '@/lib/dates'

const CATEGORIES = ['all', 'jerky', 'steaks', 'smoked', 'non_smoked', 'boards']

type BossLine = {
  product_id: string
  product_name: string
  category: string
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
  unit_price: number
  line_total: number
}

export default function BossNewOrderPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('all')
  const [lines, setLines] = useState<BossLine[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [flavor, setFlavor] = useState('')
  const [weight, setWeight] = useState('')
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [deliveryAreaId, setDeliveryAreaId] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(todayLocal())
  const [notes, setNotes] = useState('')
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { void loadCatalog() }, [])

  async function loadCatalog() {
    const res = await fetchWithAuth('/api/boss/catalog')
    const data = await res.json()
    setProducts(data.products ?? [])
    setCustomers(data.customers ?? [])
    setAreas(data.deliveryAreas ?? [])
  }

  const matchingCustomers = customers.filter(customer => {
    const query = customerSearch.toLowerCase()
    return query && (
      customer.full_name.toLowerCase().includes(query) ||
      (customer.phone ?? '').toLowerCase().includes(query)
    )
  }).slice(0, 5)

  const filteredProducts = category === 'all' ? products : products.filter(product => product.category === category)
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0)
  const deliveryFeeAmount = Number(deliveryFee || 0)
  const total = subtotal + deliveryFeeAmount

  const canPlaceOrder = useMemo(() => {
    if (!name.trim() || !phone.trim()) return false
    if (lines.length === 0) return false
    if (!deliveryDate) return false
    if (orderType === 'delivery' && !deliveryAddress.trim()) return false
    return true
  }, [name, phone, lines.length, deliveryDate, orderType, deliveryAddress])

  const placeOrderPayload = useMemo((): BossPlaceOrderPayload => ({
    customerId,
    customer: { full_name: name.trim(), phone: phone.trim(), email: email.trim() },
    items: lines,
    orderType,
    deliveryAreaId,
    deliveryAddress,
    deliveryFee: deliveryFeeAmount,
    deliveryDate,
    notes,
  }), [customerId, name, phone, email, lines, orderType, deliveryAreaId, deliveryAddress, deliveryFeeAmount, deliveryDate, notes])

  const placeOrderHint = useMemo(() => {
    if (!name.trim() || !phone.trim()) return 'Enter customer name and phone'
    if (lines.length === 0) return 'Add at least one product'
    if (!deliveryDate) return 'Choose a delivery or pickup date'
    if (orderType === 'delivery' && !deliveryAddress.trim()) return 'Enter delivery address'
    return ''
  }, [name, phone, lines.length, deliveryDate, orderType, deliveryAddress])

  function chooseCustomer(customer: Customer) {
    setCustomerSearch(customer.full_name)
    setCustomerId(customer.id)
    setName(customer.full_name)
    setPhone(customer.phone ?? '')
    setEmail(customer.email)
  }

  function openProduct(product: Product) {
    setSelectedProduct(product)
    setFlavor(product.flavors?.[0] ?? '')
    setWeight(product.weight_options?.[0] ? String(product.weight_options[0]) : '')
  }

  function addSelectedProduct() {
    if (!selectedProduct) return
    const selectedWeight = selectedProduct.category === 'jerky' ? Number(weight) : null
    const unitPrice = selectedWeight ? selectedProduct.price * selectedWeight : selectedProduct.price
    const selectedSize = selectedProduct.category === 'boards' ? selectedProduct.size_label : null
    const line: BossLine = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      category: selectedProduct.category,
      quantity: selectedProduct.category === 'jerky' ? 1 : 1,
      selected_flavor: selectedProduct.category === 'jerky' ? flavor || null : null,
      selected_weight: selectedWeight,
      selected_size: selectedSize,
      unit_price: unitPrice,
      line_total: unitPrice,
    }
    setLines(current => [...current, line])
    setSelectedProduct(null)
  }

  function removeLine(index: number) {
    setLines(current => current.filter((_, i) => i !== index))
  }

  function handleOrderPlaced(orderNumber: string) {
    setShowPlaceModal(false)
    setMessage(`Order ${orderNumber} created.`)
    setLines([])
    setNotes('')
    setCustomerSearch('')
    setCustomerId('')
    setName('')
    setPhone('')
    setEmail('')
    setDeliveryAddress('')
  }

  return (
    <div className="space-y-5 p-4 text-base">
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">Customer</h2>
        <input value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setCustomerId('') }}
          placeholder="Search name or phone" className="mb-3 h-12 w-full rounded-2xl border px-4 text-base" />
        {matchingCustomers.length > 0 && (
          <div className="mb-3 divide-y rounded-2xl border">
            {matchingCustomers.map(customer => (
              <button key={customer.id} onClick={() => chooseCustomer(customer)} className="block min-h-12 w-full px-4 py-3 text-left text-base">
                <strong>{customer.full_name}</strong><br /><span className="text-gray-500">{customer.phone}</span>
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" className="h-12 rounded-2xl border px-4 text-base" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="h-12 rounded-2xl border px-4 text-base" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email optional" className="h-12 rounded-2xl border px-4 text-base" />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">Products</h2>
        <div className="-mx-4 mb-3 overflow-x-auto px-4">
          <div className="flex min-w-max gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} className={`min-h-12 rounded-full px-4 text-base font-bold capitalize ${category === cat ? 'text-white' : 'bg-gray-100 text-gray-700'}`} style={category === cat ? { background: 'var(--navy)' } : {}}>
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {filteredProducts.map(product => (
            <button key={product.id} onClick={() => openProduct(product)} className="min-h-20 rounded-2xl border bg-white p-3 text-left text-base font-bold">
              {product.name}<br /><span className="text-sm font-semibold text-orange-600">${product.price}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedProduct && (
        <section className="rounded-3xl border-2 border-orange-200 bg-orange-50 p-4">
          <h3 className="mb-3 text-lg font-black">{selectedProduct.name}</h3>
          {selectedProduct.category === 'jerky' && (
            <div className="grid gap-3">
              <select value={flavor} onChange={e => setFlavor(e.target.value)} className="h-12 rounded-2xl border px-4 text-base">
                {(selectedProduct.flavors ?? []).map(option => <option key={option}>{option}</option>)}
              </select>
              <select value={weight} onChange={e => setWeight(e.target.value)} className="h-12 rounded-2xl border px-4 text-base">
                {(selectedProduct.weight_options ?? []).map(option => <option key={option} value={option}>{option} lb</option>)}
              </select>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button onClick={() => setSelectedProduct(null)} className="min-h-12 rounded-2xl border bg-white font-bold">Cancel</button>
            <button onClick={addSelectedProduct} className="min-h-12 rounded-2xl font-black text-white" style={{ background: 'var(--navy)' }}>Add</button>
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">Order</h2>
        {lines.map((line, index) => (
          <div key={`${line.product_id}-${index}`} className="flex justify-between gap-3 border-b py-3">
            <div className="text-base font-bold">{line.product_name}<div className="text-sm font-medium text-gray-500">{[line.selected_flavor, line.selected_weight && `${line.selected_weight} lb`, line.selected_size].filter(Boolean).join(' • ')}</div></div>
            <button onClick={() => removeLine(index)} className="text-red-600 font-bold">${line.line_total.toFixed(2)} ✕</button>
          </div>
        ))}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => setOrderType('delivery')} className={`min-h-12 rounded-2xl font-bold ${orderType === 'delivery' ? 'text-white' : 'bg-gray-100'}`} style={orderType === 'delivery' ? { background: 'var(--navy)' } : {}}>Delivery</button>
          <button onClick={() => setOrderType('pickup')} className={`min-h-12 rounded-2xl font-bold ${orderType === 'pickup' ? 'text-white' : 'bg-gray-100'}`} style={orderType === 'pickup' ? { background: 'var(--navy)' } : {}}>Pickup</button>
        </div>
        {orderType === 'delivery' && (
          <div className="mt-3 grid gap-3">
            <select value={deliveryAreaId} onChange={e => {
              setDeliveryAreaId(e.target.value)
              const area = areas.find(a => a.id === e.target.value)
              if (area) setDeliveryFee(String(area.delivery_fee))
            }} className="h-12 rounded-2xl border px-4 text-base">
              <option value="">Delivery area</option>
              {areas.map(area => <option key={area.id} value={area.id}>{area.name} (${area.delivery_fee})</option>)}
              <option value="">Personal Delivery</option>
              <option value="">Uber</option>
            </select>
            <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Delivery address" className="h-12 rounded-2xl border px-4 text-base" />
          </div>
        )}
        <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="Delivery fee" className="mt-3 h-12 w-full rounded-2xl border px-4 text-base" />
        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="mt-3 h-12 w-full rounded-2xl border px-4 text-base" />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Order notes" className="mt-3 min-h-24 w-full rounded-2xl border p-4 text-base" />
        {!canPlaceOrder && placeOrderHint && (
          <p className="mt-3 text-center text-sm font-semibold text-gray-500">{placeOrderHint}</p>
        )}
        {lines.length > 0 && !canPlaceOrder && (
          <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-lg font-black">
            <span>Total</span>
            <span style={{ color: 'var(--orange)' }}>${total.toFixed(2)}</span>
          </div>
        )}
      </section>

      {canPlaceOrder ? (
      <section className="rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex justify-between text-xl font-black"><span>Total</span><span>${total.toFixed(2)}</span></div>
        <button
          type="button"
          onClick={() => setShowPlaceModal(true)}
          className="min-h-14 w-full rounded-2xl text-lg font-black text-white"
          style={{ background: 'var(--orange)' }}
        >
          Place Order
        </button>
        {message && <p className="mt-3 text-center text-base font-bold text-gray-700">{message}</p>}
      </section>
      ) : message ? (
        <p className="rounded-3xl bg-white p-4 text-center text-base font-bold text-gray-700 shadow-sm">{message}</p>
      ) : null}

      <BossPlaceOrderModal
        open={showPlaceModal}
        onClose={() => setShowPlaceModal(false)}
        payload={placeOrderPayload}
        subtotal={subtotal}
        deliveryFee={deliveryFeeAmount}
        total={total}
        lineCount={lines.length}
        onSuccess={handleOrderPlaced}
      />
    </div>
  )
}
