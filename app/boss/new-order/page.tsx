'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BossLine, Customer, DeliveryArea, Product } from '@/types'
import BossCardPayment, { type BossCardPaymentHandle } from '@/components/BossCardPayment'
import CustomerImportPanel from '@/components/CustomerImportPanel'
import BossPlaceOrderModal, { type BossPlaceOrderPayload } from '@/components/BossPlaceOrderModal'
import BossProductSheet from '@/components/BossProductSheet'
import { customerMatchesSearch } from '@/lib/customer-search'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { todayLocal } from '@/lib/dates'
import {
  collapseVariantProducts,
  compareProductsPriceAsc,
  formatPrice,
  getProductVariants,
  groupBoardProducts,
} from '@/lib/product-display'

const CATEGORIES = ['all', 'jerky', 'steaks', 'smoked', 'non_smoked', 'boards']

type CustomerMode = 'search' | 'selected' | 'new'

const STICKY_BOTTOM = 'calc(4.75rem + env(safe-area-inset-bottom))'

export default function BossNewOrderPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [customerMode, setCustomerMode] = useState<CustomerMode>('search')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('all')
  const [lines, setLines] = useState<BossLine[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showAddedToast, setShowAddedToast] = useState(false)
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [deliveryAreaId, setDeliveryAreaId] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(todayLocal())
  const [notes, setNotes] = useState('')
  const [chargeCard, setChargeCard] = useState(false)
  const [cardPaymentComplete, setCardPaymentComplete] = useState(false)
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [message, setMessage] = useState('')
  const cardPaymentRef = useRef<BossCardPaymentHandle>(null)
  const addedToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { void loadCatalog() }, [])

  useEffect(() => {
    return () => {
      if (addedToastTimer.current) clearTimeout(addedToastTimer.current)
    }
  }, [])

  async function loadCatalog() {
    const res = await fetchWithAuth('/api/boss/catalog')
    const data = await res.json()
    setProducts(data.products ?? [])
    setCustomers(data.customers ?? [])
    setAreas(data.deliveryAreas ?? [])
  }

  const searchQuery = customerSearch.trim()
  const matchingCustomers = useMemo(() => {
    if (!searchQuery) return []
    return customers.filter(customer => customerMatchesSearch(customer, searchQuery)).slice(0, 8)
  }, [customers, searchQuery])

  const showCustomerDropdown = customerMode === 'search' && searchQuery.length >= 2 && matchingCustomers.length > 0
  const showNewCustomerOption = customerMode === 'search' && searchQuery.length >= 2 && matchingCustomers.length === 0

  const filteredProducts = [
    ...collapseVariantProducts(
      category === 'all' ? products : products.filter(product => product.category === category),
    ),
  ].sort(compareProductsPriceAsc)
  const boardGroups = category === 'boards' ? groupBoardProducts(filteredProducts) : []
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
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
    if (!name.trim() || !phone.trim()) return 'Select or add a customer'
    if (lines.length === 0) return 'Add at least one product'
    if (!deliveryDate) return 'Choose a delivery or pickup date'
    if (orderType === 'delivery' && !deliveryAddress.trim()) return 'Enter delivery address'
    return ''
  }, [name, phone, lines.length, deliveryDate, orderType, deliveryAddress])

  function clearCustomer() {
    setCustomerMode('search')
    setCustomerSearch('')
    setCustomerId('')
    setName('')
    setPhone('')
    setEmail('')
  }

  function chooseCustomer(customer: Customer) {
    setCustomerId(customer.id)
    setName(customer.full_name)
    setPhone(customer.phone ?? '')
    setEmail(customer.email ?? '')
    setCustomerSearch('')
    setCustomerMode('selected')
  }

  function startNewCustomer() {
    const queryDigits = searchQuery.replace(/\D/g, '')
    const looksLikePhone = queryDigits.length >= 7
    setCustomerId('')
    setName(looksLikePhone ? '' : searchQuery)
    setPhone(looksLikePhone ? searchQuery : '')
    setEmail('')
    setCustomerSearch('')
    setCustomerMode('new')
  }

  function openProduct(product: Product) {
    setSelectedProduct(product)
  }

  function addLine(line: BossLine) {
    setLines(current => [...current, line])
    setSelectedProduct(null)
    setShowAddedToast(true)
    if (addedToastTimer.current) clearTimeout(addedToastTimer.current)
    addedToastTimer.current = setTimeout(() => setShowAddedToast(false), 2000)
  }

  function removeLine(index: number) {
    setLines(current => current.filter((_, i) => i !== index))
  }

  function handleOrderPlaced(orderNumber: string, savedCustomer?: Customer) {
    setShowPlaceModal(false)
    setChargeCard(false)
    setCardPaymentComplete(false)
    setPlacingOrder(false)
    setMessage(`Order ${orderNumber} created.`)
    setLines([])
    setNotes('')
    clearCustomer()
    setDeliveryAddress('')
    if (savedCustomer) {
      setCustomers(prev => {
        const rest = prev.filter(c => c.id !== savedCustomer.id)
        return [savedCustomer, ...rest]
      })
    } else {
      void loadCatalog()
    }
  }

  async function createOrder(paymentIntentId?: string) {
    setPlacingOrder(true)
    setMessage('')
    try {
      const res = await fetchWithAuth('/api/boss/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...placeOrderPayload, paymentIntentId }),
      })
      const data = await res.json()
      if (res.ok) {
        handleOrderPlaced(data.orderNumber, data.customer as Customer | undefined)
      } else {
        setMessage(data.error ?? 'Could not create order')
        setPlacingOrder(false)
      }
    } catch {
      setMessage('Could not create order')
      setPlacingOrder(false)
    }
  }

  async function handlePlaceOrderClick() {
    setMessage('')
    if (!canPlaceOrder) return
    if (chargeCard) {
      if (!cardPaymentComplete) {
        setMessage('Enter complete card details in the Order section.')
        return
      }
      const result = await cardPaymentRef.current?.confirmPayment()
      if (!result?.ok) {
        setMessage(result?.error ?? 'Could not authorize card')
        return
      }
      await createOrder(result.paymentIntentId)
      return
    }
    setShowPlaceModal(true)
  }

  const itemCountLabel = itemCount === 1 ? '1 item' : `${itemCount} items`

  return (
    <>
      <div className="space-y-5 p-4 pb-52 text-base">
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">Customer</h2>

          <CustomerImportPanel
            variant="boss"
            onComplete={() => void loadCatalog()}
            onCustomersMerged={setCustomers}
          />

          {customerMode === 'search' && (
            <div className="relative">
              <input
                type="search"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Search customer by name or phone"
                className="h-12 w-full rounded-2xl border px-4 text-base"
                autoComplete="off"
              />
              {showCustomerDropdown && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 max-h-64 overflow-y-auto divide-y rounded-2xl border bg-white shadow-lg">
                  {matchingCustomers.map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => chooseCustomer(customer)}
                      className="block min-h-12 w-full px-4 py-3 text-left text-base hover:bg-gray-50"
                    >
                      <div className="font-bold">{customer.full_name}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    </button>
                  ))}
                </div>
              )}
              {showNewCustomerOption && (
                <button
                  type="button"
                  onClick={startNewCustomer}
                  className="mt-3 min-h-12 w-full rounded-2xl border-2 border-dashed border-gray-300 px-4 text-base font-bold text-gray-700 hover:border-orange-300 hover:bg-orange-50"
                >
                  New customer
                </button>
              )}
            </div>
          )}

          {customerMode === 'selected' && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-lg font-black">{name}</div>
                  <div className="text-base text-gray-700">{phone}</div>
                  <div className="text-sm text-gray-500">{email || 'No email on file'}</div>
                </div>
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {customerMode === 'new' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-500">New customer</p>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Customer name"
                className="h-12 w-full rounded-2xl border px-4 text-base"
              />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone"
                className="h-12 w-full rounded-2xl border px-4 text-base"
              />
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email optional"
                className="h-12 w-full rounded-2xl border px-4 text-base"
              />
              <button
                type="button"
                onClick={clearCustomer}
                className="min-h-10 text-sm font-bold text-gray-600 underline"
              >
                Search existing customer
              </button>
            </div>
          )}
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
          {category === 'boards' ? (
            <div className="space-y-5">
              {boardGroups.map(group => (
                <div key={group.id}>
                  <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-500">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {group.products.map(product => (
                      <button key={product.id} onClick={() => openProduct(product)} className="min-h-20 rounded-2xl border bg-white p-3 text-left text-base font-bold">
                        {product.name}<br /><span className="text-sm font-semibold text-orange-600">{formatPrice(product)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.map(product => (
                <button key={product.id} onClick={() => openProduct(product)} className="min-h-20 rounded-2xl border bg-white p-3 text-left text-base font-bold">
                  {product.name}<br /><span className="text-sm font-semibold text-orange-600">{formatPrice(product)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {lines.length > 0 && (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-black">Cart</h2>
            {lines.map((line, index) => (
              <div key={`${line.product_id}-${index}`} className="flex justify-between gap-3 border-b py-3">
                <div className="text-base font-bold">
                  {line.product_name}
                  {line.quantity > 1 && <span className="text-gray-600"> × {line.quantity}</span>}
                  <div className="text-sm font-medium text-gray-500">
                    {[line.selected_flavor, line.selected_weight && `${line.selected_weight} lb`, line.selected_size].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <button type="button" onClick={() => removeLine(index)} className="shrink-0 font-bold text-red-600">
                  ${line.line_total.toFixed(2)} ✕
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">Order</h2>
          {lines.length === 0 && (
            <p className="mb-3 text-sm font-semibold text-gray-500">Add products above to build the order.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setOrderType('delivery')} className={`min-h-12 rounded-2xl font-bold ${orderType === 'delivery' ? 'text-white' : 'bg-gray-100'}`} style={orderType === 'delivery' ? { background: 'var(--navy)' } : {}}>Delivery</button>
            <button type="button" onClick={() => setOrderType('pickup')} className={`min-h-12 rounded-2xl font-bold ${orderType === 'pickup' ? 'text-white' : 'bg-gray-100'}`} style={orderType === 'pickup' ? { background: 'var(--navy)' } : {}}>Pickup</button>
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

          {canPlaceOrder && (
            <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-lg font-black">
                <span>Order total</span>
                <span style={{ color: 'var(--orange)' }}>${total.toFixed(2)}</span>
              </div>
              <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 border-orange-200 bg-orange-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={chargeCard}
                  onChange={e => {
                    setChargeCard(e.target.checked)
                    setCardPaymentComplete(false)
                    setMessage('')
                  }}
                  className="mt-1 h-5 w-5 rounded border-gray-300"
                />
                <span>
                  <span className="block text-base font-black text-gray-900">Charge credit card now</span>
                  <span className="block text-sm font-medium text-gray-600">
                    Card is authorized now and captured when you approve the order.
                  </span>
                </span>
              </label>
              {chargeCard && (
                <BossCardPayment
                  ref={cardPaymentRef}
                  active={chargeCard}
                  subtotal={subtotal}
                  deliveryFee={deliveryFeeAmount}
                  email={email}
                  onCompleteChange={setCardPaymentComplete}
                />
              )}
            </div>
          )}

          {!canPlaceOrder && placeOrderHint && (
            <p className="mt-3 text-center text-sm font-semibold text-gray-500">{placeOrderHint}</p>
          )}
          {message && (
            <p className="mt-3 text-center text-base font-bold text-gray-700">{message}</p>
          )}
        </section>
      </div>

      {showAddedToast && (
        <div
          className="pointer-events-none fixed left-1/2 z-[70] -translate-x-1/2 rounded-2xl px-6 py-3 text-lg font-black text-white shadow-lg"
          style={{ bottom: 'calc(8.5rem + env(safe-area-inset-bottom))', background: 'var(--navy)' }}
        >
          Added!
        </div>
      )}

      <div
        className="fixed left-0 right-0 z-[45] border-t border-white/10 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
        style={{ bottom: STICKY_BOTTOM, background: 'var(--navy)' }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-white">
            <div className="text-sm font-semibold text-white/70">{itemCountLabel}</div>
            <div className="text-xl font-black">${subtotal.toFixed(2)}</div>
            {!canPlaceOrder && placeOrderHint && (
              <div className="truncate text-xs font-medium text-white/50">{placeOrderHint}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handlePlaceOrderClick}
            disabled={!canPlaceOrder || placingOrder || (chargeCard && !cardPaymentComplete)}
            className="min-h-12 shrink-0 rounded-2xl px-5 text-base font-black text-white disabled:opacity-40"
            style={{ background: 'var(--orange)' }}
          >
            {placingOrder
              ? 'Placing...'
              : chargeCard && canPlaceOrder
                ? `Charge $${total.toFixed(2)}`
                : 'Place Order'}
          </button>
        </div>
      </div>

      {selectedProduct && (
        <BossProductSheet
          product={selectedProduct}
          sizeVariants={getProductVariants(selectedProduct, products)}
          onClose={() => setSelectedProduct(null)}
          onAdd={addLine}
        />
      )}

      <BossPlaceOrderModal
        open={showPlaceModal}
        onClose={() => setShowPlaceModal(false)}
        payload={placeOrderPayload}
        total={total}
        lineCount={lines.length}
        onSuccess={handleOrderPlaced}
      />
    </>
  )
}
