'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminLayout from '@/components/AdminLayout'
import type { Order } from '@/types'

const STATUS_TABS = ['all', 'pending', 'approved', 'out_for_delivery', 'delivered', 'cancelled']
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function playNotificationSound() {
  const AudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext
  if (!AudioContext) return

  const audioContext = new AudioContext()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
  oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 0.12)
  gain.gain.setValueAtTime(0.001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.35)
}

async function requestNotificationPermission() {
  if (!('Notification' in window) || Notification.permission !== 'default') return
  await Notification.requestPermission()
}

async function showBrowserNotification(message: string) {
  if (!('Notification' in window)) return

  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  if (Notification.permission === 'granted') {
    new Notification('Smoked Style Admin', {
      body: message,
      tag: 'smoked-style-orders',
    })
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/orders', {
      credentials: 'include',
      cache: 'no-store',
    })
    const payload = await res.json()

    if (!res.ok) {
      setError(payload.error ?? 'Could not load orders')
      setOrders([])
    } else {
      setOrders(payload.orders ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    const supabase = createClientComponentClient()
    void requestNotificationPermission()

    // Enable Supabase Realtime for public.orders in Database > Replication for these callbacks to fire.
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        void fetchOrders()
        playNotificationSound()
        void showBrowserNotification('New order received!')
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        void fetchOrders()
        if (payload.new.status === 'delivered') {
          playNotificationSound()
          void showBrowserNotification('Order delivered!')
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchOrders])

  const filtered = orders.filter(o => {
    const matchTab = activeTab === 'all' || o.status === activeTab
    const matchSearch = search === '' ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customers as any)?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Orders</h1>
          <div className="flex gap-3">
            <div className="bg-yellow-100 text-yellow-800 text-sm font-semibold px-3 py-1 rounded-full">
              {counts.pending} Pending
            </div>
            <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
              {counts.approved} Approved
            </div>
          </div>
        </div>

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by order number or customer name..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-orange-400"
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              style={activeTab === tab ? { background: 'var(--navy)' } : {}}>
              {tab === 'all' ? 'All' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{order.order_number}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{(order.customers as any)?.full_name ?? 'Guest'}</p>
                      {order.delivery_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          📅 {new Date(order.delivery_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color: 'var(--orange)' }}>${order.total.toFixed(2)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
