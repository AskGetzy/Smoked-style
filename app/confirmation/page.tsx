'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ConfirmationContent() {
  const params = useSearchParams()
  const orderNumber = params.get('order') ?? 'SS-2026-0001'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--cream)' }}>
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--navy)' }}>Order Received!</h1>
        <p className="text-gray-500 text-sm mb-4">We'll review your order and confirm shortly.</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="text-xs text-gray-500 font-semibold mb-1">ORDER NUMBER</div>
          <div className="text-xl font-black" style={{ color: 'var(--navy)' }}>{orderNumber}</div>
        </div>

        {/* Status bar */}
        <div className="flex items-center mb-6">
          {['Pending', 'Approved', 'Out for Delivery', 'Delivered'].map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>{i === 0 ? '●' : i + 1}</div>
                <span className={`text-xs mt-1 ${i === 0 ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}
                  style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < 3 && <div className="flex-1 h-0.5 bg-gray-200 mx-1 mb-4" />}
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-lg">💳</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Card Authorized — Not Charged Yet</p>
              <p className="text-xs text-blue-600 mt-0.5">Your card has been authorized. We'll only charge it once your order is approved.</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-gray-700 mb-1">Questions?</p>
          <p className="text-xs text-gray-500">Call or WhatsApp: <a href="tel:7188109472" className="text-orange-600 font-semibold">(718) 810-9472</a></p>
          <p className="text-xs text-gray-500 mt-0.5">Email: <a href="mailto:Smokedstyle1@gmail.com" className="text-orange-600 font-semibold">Smokedstyle1@gmail.com</a></p>
        </div>

        <Link
          href={`/order-status/${encodeURIComponent(orderNumber)}`}
          className="mb-3 block w-full rounded-xl border-2 border-orange-500 py-3 font-bold text-orange-600"
        >
          Track Your Order
        </Link>

        <Link href="/" className="block w-full rounded-xl py-3 font-bold text-white" style={{ background: 'var(--navy)' }}>
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  )
}
