import { matchOrdersByPhone, summarizeOrderItems, type PublicOrderItem } from '@/lib/order-tracking'
import { normalizePhoneDigits } from '@/lib/phone'
import type { SupabaseClient } from '@supabase/supabase-js'

const PHONE_ORDER_SELECT =
  'id, order_number, status, delivery_date, created_at, buyer_phone, recipient_phone, customers(phone), order_items(product_name, quantity, selected_flavor, selected_weight, selected_size)'

type PhoneOrderRow = {
  id: string
  order_number: string
  status: string
  delivery_date: string | null
  created_at: string
  buyer_phone: string | null
  recipient_phone: string | null
  customers?: { phone?: string | null } | null
  order_items: unknown
}

export async function findOrdersByPhone(supabase: SupabaseClient, phone: string, limit = 5) {
  const digits = normalizePhoneDigits(phone)
  if (digits.length < 7) return []

  const last10 = digits.length >= 10 ? digits.slice(-10) : digits
  const pattern = `%${last10}%`

  const [{ data: directMatches, error: directError }, { data: customers, error: customerError }] =
    await Promise.all([
      supabase
        .from('orders')
        .select(PHONE_ORDER_SELECT)
        .or(`buyer_phone.ilike.${pattern},recipient_phone.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('customers').select('id').ilike('phone', pattern).limit(50),
    ])

  if (directError) throw directError
  if (customerError) throw customerError

  const byId = new Map<string, PhoneOrderRow>()
  for (const row of (directMatches ?? []) as PhoneOrderRow[]) {
    byId.set(row.id, row)
  }

  const customerIds = (customers ?? []).map(c => c.id).filter(Boolean)
  if (customerIds.length > 0) {
    const { data: customerOrders, error: customerOrdersError } = await supabase
      .from('orders')
      .select(PHONE_ORDER_SELECT)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (customerOrdersError) throw customerOrdersError

    for (const row of (customerOrders ?? []) as PhoneOrderRow[]) {
      byId.set(row.id, row)
    }
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return matchOrdersByPhone(merged, digits, limit).map(order => {
    const items = (order.order_items ?? []) as PublicOrderItem[]
    return {
      order_number: order.order_number,
      status: order.status,
      delivery_date: order.delivery_date,
      items_summary: summarizeOrderItems(items),
    }
  })
}
