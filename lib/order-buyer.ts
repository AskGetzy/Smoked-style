import type { Order } from '@/types'

type OrderWithBuyer = {
  buyer_name?: string | null
  buyer_phone?: string | null
  buyer_email?: string | null
  customers?: { full_name?: string | null; phone?: string | null; email?: string | null } | null
}

export function displayBuyerName(order: OrderWithBuyer): string {
  return order.buyer_name?.trim() || order.customers?.full_name?.trim() || 'Guest'
}

export function displayBuyerPhone(order: OrderWithBuyer): string | null {
  return order.buyer_phone?.trim() || order.customers?.phone?.trim() || null
}

export function displayBuyerEmail(order: OrderWithBuyer): string | null {
  return order.buyer_email?.trim() || order.customers?.email?.trim() || null
}
