'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BulkRecipientInput, BulkRecipientRow } from '@/lib/bulk-order'
import {
  buildBulkOrderTemplateCsv,
  bulkOrderTotal,
  parseBulkOrderCsv,
  validateBulkRecipientRows,
} from '@/lib/bulk-order'
import { fetchWithAuth } from '@/lib/auth-fetch'
import { customerMatchesSearch } from '@/lib/customer-search'
import type { Customer, DeliveryArea, Product } from '@/types'

type Props = {
  variant: 'admin' | 'boss'
}

type BuyerMode = 'search' | 'selected' | 'new'

type SaveMethod = 'cash' | 'check'

function downloadTemplate() {
  const blob = new Blob([buildBulkOrderTemplateCsv()], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'bulk-order-template.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function BulkOrderBuilder({ variant }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [buyerMode, setBuyerMode] = useState<BuyerMode>('search')
  const [customerSearch, setCustomerSearch] = useState('')
  const [buyerId, setBuyerId] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [hasCardOnFile, setHasCardOnFile] = useState(false)
  const [checkingCard, setCheckingCard] = useState(false)

  const [rows, setRows] = useState<BulkRecipientRow[]>([])
  const [fileName, setFileName] = useState('')
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [saveMethod, setSaveMethod] = useState<SaveMethod>('cash')
  const [success, setSuccess] = useState<{ orderNumber: string; paymentLinkUrl?: string | null } | null>(null)

  useEffect(() => {
    void loadCatalog()
  }, [])

  async function loadCatalog() {
    setLoading(true)
    setError('')
    try {
      const res = await fetchWithAuth('/api/boss/catalog')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load bulk-order catalog')
      setProducts(data.products ?? [])
      setCustomers(data.customers ?? [])
      setAreas(data.deliveryAreas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bulk-order catalog')
    } finally {
      setLoading(false)
    }
  }

  const searchQuery = customerSearch.trim()
  const matchingCustomers = useMemo(() => {
    if (!searchQuery) return []
    return customers.filter(customer => customerMatchesSearch(customer, searchQuery)).slice(0, 8)
  }, [customers, searchQuery])

  const showCustomerDropdown = buyerMode === 'search' && searchQuery.length >= 2 && matchingCustomers.length > 0
  const showNewCustomerOption = buyerMode === 'search' && searchQuery.length >= 2 && matchingCustomers.length === 0
  const buyerReady = buyerName.trim().length > 0 && buyerPhone.trim().length > 0

  const selectedRows = useMemo(() => rows.filter(row => !row.skipped), [rows])
  const total = useMemo(() => bulkOrderTotal(selectedRows), [selectedRows])

  async function loadBuyerPaymentStatus(customerId: string) {
    setCheckingCard(true)
    try {
      const res = await fetchWithAuth(`/api/bulk-orders/customer?customerId=${encodeURIComponent(customerId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load buyer details')
      const customer = data.customer as Customer
      setHasCardOnFile(Boolean(customer.has_card_on_file))
      setBuyerEmail(customer.email ?? '')
      setBuyerPhone(customer.phone ?? '')
      setBuyerName(customer.full_name)
    } catch (err) {
      setHasCardOnFile(false)
      setError(err instanceof Error ? err.message : 'Could not load buyer details')
    } finally {
      setCheckingCard(false)
    }
  }

  function clearBuyer() {
    setBuyerMode('search')
    setCustomerSearch('')
    setBuyerId('')
    setBuyerName('')
    setBuyerPhone('')
    setBuyerEmail('')
    setHasCardOnFile(false)
  }

  function chooseCustomer(customer: Customer) {
    setBuyerMode('selected')
    setBuyerId(customer.id)
    setBuyerName(customer.full_name)
    setBuyerPhone(customer.phone ?? '')
    setBuyerEmail(customer.email ?? '')
    setCustomerSearch('')
    void loadBuyerPaymentStatus(customer.id)
  }

  function startNewBuyer() {
    const digits = searchQuery.replace(/\D/g, '')
    const looksLikePhone = digits.length >= 7
    setBuyerMode('new')
    setBuyerId('')
    setBuyerName(looksLikePhone ? '' : searchQuery)
    setBuyerPhone(looksLikePhone ? searchQuery : '')
    setBuyerEmail('')
    setCustomerSearch('')
    setHasCardOnFile(false)
  }

  async function handleFileUpload(file: File) {
    setSuccess(null)
    setUploadErrors([])
    setFileName(file.name)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setRows([])
      setUploadErrors(['Upload a CSV file using the template columns.'])
      return
    }

    const text = await file.text()
    const parsed = parseBulkOrderCsv(text)
    const validation = validateBulkRecipientRows(parsed, products, areas)
    setRows(validation.rows)
    setUploadErrors(validation.errors)
  }

  function toggleSkip(rowNumber: number) {
    setRows(current => current.map(row =>
      row.rowNumber === rowNumber
        ? { ...row, skipped: !row.skipped }
        : row,
    ))
  }

  async function submit(paymentMethod: 'payment_link' | 'card_on_file' | SaveMethod) {
    setSubmitting(true)
    setError('')
    setSuccess(null)
    try {
      const res = await fetchWithAuth('/api/bulk-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: {
            customerId: buyerId,
            full_name: buyerName,
            phone: buyerPhone,
            email: buyerEmail,
          },
          paymentMethod,
          recipients: selectedRows,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not create bulk order')
      setSuccess({ orderNumber: data.orderNumber, paymentLinkUrl: data.paymentLinkUrl })
      setRows([])
      setUploadErrors([])
      setFileName('')
      if (!buyerId) clearBuyer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create bulk order')
    } finally {
      setSubmitting(false)
    }
  }

  const card = variant === 'admin'
    ? 'rounded-xl border border-gray-100 bg-white p-5 shadow-sm'
    : 'rounded-3xl bg-white p-4 shadow-sm'

  return (
    <div className={variant === 'admin' ? 'space-y-5 p-6' : 'space-y-4 p-4 pb-28 text-base'}>
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className={variant === 'admin' ? 'text-2xl font-bold' : 'text-2xl font-black'} style={{ color: 'var(--navy)' }}>
              Bulk Order Upload
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              One buyer pays once. Upload recipient-only rows for delivery and pickup stops.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700"
          >
            Download CSV Template
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-lg font-black">Who is paying for this order?</h2>
        {buyerMode === 'search' && (
          <div className="relative">
            <input
              type="search"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Search buyer by name, phone, or email"
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
                    className="block w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="font-bold text-gray-900">{customer.full_name}</div>
                    <div className="text-sm text-gray-500">{customer.phone || 'No phone'} · {customer.email || 'No email'}</div>
                  </button>
                ))}
              </div>
            )}
            {showNewCustomerOption && (
              <button
                type="button"
                onClick={startNewBuyer}
                className="mt-3 w-full rounded-2xl border-2 border-dashed border-gray-300 px-4 py-3 text-base font-bold text-gray-700"
              >
                New buyer
              </button>
            )}
          </div>
        )}

        {buyerMode === 'selected' && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black text-gray-900">{buyerName}</div>
                <div className="text-sm text-gray-600">{buyerPhone || 'No phone'}</div>
                <div className="text-sm text-gray-500">{buyerEmail || 'No email on file'}</div>
                <div className="mt-2 text-xs font-bold uppercase tracking-wide text-orange-700">
                  {checkingCard ? 'Checking card on file…' : hasCardOnFile ? 'Card on file available' : 'No saved card on file'}
                </div>
              </div>
              <button type="button" onClick={clearBuyer} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm">
                Change
              </button>
            </div>
          </div>
        )}

        {buyerMode === 'new' && (
          <div className="space-y-3">
            <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Buyer name" className="h-12 w-full rounded-2xl border px-4 text-base" />
            <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="Buyer phone" className="h-12 w-full rounded-2xl border px-4 text-base" />
            <input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="Buyer email" className="h-12 w-full rounded-2xl border px-4 text-base" />
            <button type="button" onClick={clearBuyer} className="text-sm font-bold text-gray-600 underline">
              Search existing buyer instead
            </button>
          </div>
        )}
      </section>

      <section className={`${card} ${!buyerReady ? 'opacity-60' : ''}`}>
        <h2 className="mb-3 text-lg font-black">Upload recipients</h2>
        <p className="mb-3 text-sm text-gray-500">
          CSV columns: Recipient Name, Recipient Phone, Recipient Email, Product Name, Flavor, Weight (lb), Size, Quantity, Order Type, Delivery Area, Address, Delivery Date, Notes, Gift Message.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={!buyerReady}
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) void handleFileUpload(file)
          }}
          className="block w-full text-sm text-gray-600"
        />
        {!buyerReady && <p className="mt-3 text-sm font-semibold text-gray-500">Select or create a buyer before uploading.</p>}
        {fileName && <p className="mt-3 text-sm font-semibold text-gray-700">Loaded: {fileName}</p>}
        {uploadErrors.length > 0 && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-bold">Rows to fix</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {uploadErrors.map(errorText => <li key={errorText}>{errorText}</li>)}
            </ul>
          </div>
        )}
      </section>

      {selectedRows.length > 0 && (
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black">Review bulk order</h2>
              <p className="text-sm text-gray-500">Buyer: {buyerName} · {buyerPhone}{buyerEmail ? ` · ${buyerEmail}` : ''}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-500">Combined total</div>
              <div className="text-2xl font-black text-orange-600">${total.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.rowNumber} className={`rounded-2xl border p-4 ${row.skipped ? 'border-red-200 bg-red-50/70' : 'border-gray-200 bg-white'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-gray-900">Row {row.rowNumber} · {row.recipient_name || 'Missing recipient'}</div>
                    <div className="text-sm text-gray-600">{row.product_name} · ${Number(row.line_total).toFixed(2)} · {row.order_type}</div>
                    <div className="text-sm text-gray-500">{row.delivery_date}{row.delivery_area ? ` · ${row.delivery_area}` : ''}</div>
                    {row.recipient_email && (
                      <div className="text-sm text-gray-500">Notify: {row.recipient_email}</div>
                    )}
                    {row.address && <div className="text-sm text-gray-500">{row.address}</div>}
                    {row.gift_message && <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Gift: {row.gift_message}</div>}
                    {row.errors.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                        {row.errors.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSkip(row.rowNumber)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${row.skipped ? 'bg-white text-red-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {row.skipped ? 'Include recipient' : 'Skip this recipient'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Payment</h3>
                <p className="text-sm text-gray-600">One payment for all included recipients.</p>
              </div>
              <div className="text-xl font-black text-orange-600">${total.toFixed(2)}</div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                disabled={submitting || selectedRows.length === 0}
                onClick={() => void submit('payment_link')}
                className="rounded-2xl bg-[var(--navy)] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                Send Payment Link
              </button>
              {hasCardOnFile && (
                <button
                  type="button"
                  disabled={submitting || selectedRows.length === 0}
                  onClick={() => void submit('card_on_file')}
                  className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  Charge Card on File
                </button>
              )}
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Mark as paid</div>
                <div className="mb-3 flex gap-3 text-sm font-semibold text-gray-700">
                  <label className="flex items-center gap-2"><input type="radio" checked={saveMethod === 'cash'} onChange={() => setSaveMethod('cash')} /> Cash</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={saveMethod === 'check'} onChange={() => setSaveMethod('check')} /> Check</label>
                </div>
                <button
                  type="button"
                  disabled={submitting || selectedRows.length === 0}
                  onClick={() => void submit(saveMethod)}
                  className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  Confirm {saveMethod === 'cash' ? 'Cash' : 'Check'} Paid
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {success && (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 shadow-sm">
          <div className="font-black">Bulk order {success.orderNumber} created.</div>
          {success.paymentLinkUrl && (
            <a href={success.paymentLinkUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold underline">
              Open payment link
            </a>
          )}
        </section>
      )}

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
          {error}
        </section>
      )}

      {loading && <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">Loading bulk-order tools…</div>}
    </div>
  )
}
