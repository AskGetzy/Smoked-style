'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { fetchWithAuth } from '@/lib/auth-fetch'
import {
  playDeliveredSound,
  playNewOrderSound,
  registerOrderNotificationServiceWorker,
  requestOrderNotificationPermission,
  showOrderNotification,
  vibrateNewOrder,
} from '@/lib/order-notifications'
import { displayBuyerName } from '@/lib/order-buyer'
import type { Order } from '@/types'

type Mode = 'admin' | 'boss'

type Options = {
  mode: Mode
  enabled?: boolean
  defaultNavigatePath?: string
  onInPageAlert?: (message: string, urgent: boolean) => void
}

function customerName(order: Order) {
  return displayBuyerName(order)
}

export function useOrderNotifications({
  mode,
  enabled = true,
  defaultNavigatePath,
  onInPageAlert,
}: Options) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  const hasInitializedRef = useRef(false)
  const notifyPath = defaultNavigatePath ?? (mode === 'boss' ? '/boss/orders' : '/admin/orders')

  const loadOrders = useCallback(async (): Promise<Order[]> => {
    if (mode === 'boss') {
      const res = await fetchWithAuth('/api/admin/orders', { cache: 'no-store' })
      if (!res.ok) return []
      const data = await res.json()
      return (data.orders ?? []) as Order[]
    }

    const res = await fetch('/api/admin/orders', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data.orders ?? []) as Order[]
  }, [mode])

  const notifyNewOrders = useCallback((newOrders: Order[]) => {
    if (newOrders.length === 0) return

    const firstOrder = newOrders[0]
    const body = newOrders.length === 1
      ? `NEW ORDER — ${customerName(firstOrder)} — $${firstOrder.total.toFixed(2)}`
      : `${newOrders.length} new orders received!`

    if (document.visibilityState === 'visible') {
      playNewOrderSound()
      vibrateNewOrder()
      onInPageAlert?.(`🚨 ${body}`, true)
    }

    // Boss PWA already receives server web push on new orders; skip client
    // system notifications here to avoid duplicate alerts on the same device.
    if (mode === 'boss') return

    void showOrderNotification({
      title: 'New order received',
      body,
      tag: newOrders.length === 1 ? `order-${firstOrder.id}` : 'orders-batch',
      url: notifyPath,
      urgent: true,
    })
  }, [mode, notifyPath, onInPageAlert])

  const syncOrders = useCallback(async () => {
    const orders = await loadOrders()
    const nextIds = new Set(orders.map(order => order.id))

    if (hasInitializedRef.current) {
      const newOrders = orders.filter(order => !knownOrderIdsRef.current.has(order.id))
      notifyNewOrders(newOrders)
    }

    knownOrderIdsRef.current = nextIds
    hasInitializedRef.current = true
  }, [loadOrders, notifyNewOrders])

  const enableNotifications = useCallback(async () => {
    const next = await requestOrderNotificationPermission()
    setPermission(next)
    return next
  }, [])

  useEffect(() => {
    if (!enabled) return

    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    void registerOrderNotificationServiceWorker()
    void syncOrders()

    const supabase = createClientComponentClient()
    let pollTimer: number | undefined

    const schedulePoll = () => {
      if (pollTimer) window.clearInterval(pollTimer)
      const pollMs = document.hidden ? 5000 : 15000
      pollTimer = window.setInterval(() => {
        void syncOrders()
      }, pollMs)
    }

    schedulePoll()

    const onVisibilityChange = () => {
      schedulePoll()
      if (document.visibilityState === 'visible') {
        void syncOrders()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const channel = supabase
      .channel(`order-notifications-${mode}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const newOrder = payload.new as Order
        if (knownOrderIdsRef.current.has(newOrder.id)) return
        knownOrderIdsRef.current.add(newOrder.id)
        notifyNewOrders([newOrder])
        void syncOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        const updated = payload.new as Order
        if (updated.status === 'delivered') {
          playDeliveredSound()
          void showOrderNotification({
            title: 'Order delivered',
            body: `Order ${updated.order_number} was delivered.`,
            tag: `delivered-${updated.id}`,
            url: notifyPath,
          })
        }
        void syncOrders()
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Order notification realtime channel failed; polling continues.')
        }
      })

    return () => {
      if (pollTimer) window.clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void supabase.removeChannel(channel)
    }
  }, [enabled, mode, notifyNewOrders, notifyPath, syncOrders])

  return {
    permission,
    enableNotifications,
  }
}
