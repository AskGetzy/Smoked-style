'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminLayout from '@/components/AdminLayout'
import type { Order } from '@/types'

const STATUS_TABS = ['all', 'pending', 'approved', 'out_for_delivery', 'delivered', 'cancelled']
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  ready_for_pickup: 'bg-orange-100 text-orange-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function playSound() {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.frequency.value = 800
  oscillator.type = 'sine'
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.5)
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [toast, setToast] = useState('')
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  const hasLoadedOrdersRef = useRef(false)

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 5000)
  }

  async function setupNotifications() {
    let permission: NotificationPermission = notificationPermission

    if ('Notification' in window) {
      permission = await Notification.requestPermission()
      console.log('Notification permission:', permission)
      setNotificationPermission(permission)
    }

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('/sw.js')
      console.log('Service worker registered:', reg)
    }

    if (permission === 'granted') {
      showToast('Notifications enabled!')
    } else if (permission === 'denied') {
      showToast('Please allow notifications in your browser settings')
    }
  }

  function showNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192.png' })
    } else {
      showToast(`${title}: ${body}`)
    }
  }

  function notifyNewOrders(newOrders: Order[]) {
    if (newOrders.length === 0) return

    const body = newOrders.length === 1
      ? `New order received: ${newOrders[0].order_number}`
      : `${newOrders.length} new orders received!`
    playSound()
    showNotification('New order received', body)
    showToast(body)
  }

  const fetchOrders = useCallback(async () => {
    if (!hasLoadedOrdersRef.current) {
      setLoading(true)
    }
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
      const nextOrders = (payload.orders ?? []) as Order[]
      const nextOrderIds = new Set(nextOrders.map(order => order.id))

      if (hasLoadedOrdersRef.current) {
        const newOrders = nextOrders.filter(order => !knownOrderIdsRef.current.has(order.id))
        notifyNewOrders(newOrders)
      }

      knownOrderIdsRef.current = nextOrderIds
      hasLoadedOrdersRef.current = true
      setOrders(nextOrders)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

    const supabase = createClientComponentClient()
    const pollingFallback = window.setInterval(() => {
      void fetchOrders()
    }, 15000)

    // Enable Supabase Realtime for public.orders in Database > Replication for these callbacks to fire.
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as Order
        knownOrderIdsRef.current.add(newOrder.id)
        notifyNewOrders([newOrder])
        void fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        void fetchOrders()
        if (payload.new.status === 'delivered') {
          playSound()
          showNotification('Order delivered', 'Order delivered!')
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Orders realtime channel failed. Polling fallback is still active.')
        }
      })

    return () => {
      window.clearInterval(pollingFallback)
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
          <div className="flex flex-wrap justify-end gap-3">
            <div className={`rounded-full px-3 py-1 text-sm font-semibold ${
              notificationPermission === 'granted'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              Notifications: {notificationPermission === 'granted' ? 'On' : 'Off'}
            </div>
            {notificationPermission !== 'granted' && (
              <button
                onClick={() => void setupNotifications()}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm hover:bg-orange-50"
              >
                Enable Notifications 🔔
              </button>
            )}
            <div className="bg-yellow-100 text-yellow-800 text-sm font-semibold px-3 py-1 rounded-full">
              {counts.pending} Pending
            </div>
            <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
              {counts.approved} Approved
            </div>
          </div>
        </div>

        {toast && (
          <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 shadow-lg">
            {toast}
          </div>
        )}

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
