import type { SupabaseClient } from '@supabase/supabase-js'

export const PUBLIC_ORDER_SELECT =
  'order_number, status, order_type, delivery_date, delivery_address, gift_message, order_items(product_name, quantity, selected_flavor, selected_weight, selected_size), delivery_areas(name)'

export type PublicOrderRow = {
  order_number: string
  status: string
  order_type: string
  delivery_date: string | null
  delivery_address: string | null
  gift_message: string | null
  order_items: unknown
  delivery_areas: { name?: string } | null
}

/** Resolve order by full number, SS-YYYY-#### pattern, or numeric suffix (e.g. 0031). */
export async function resolvePublicOrderByNumber(
  supabase: SupabaseClient,
  raw: string,
): Promise<PublicOrderRow | null> {
  const input = decodeURIComponent(raw).trim()
  if (!input) return null

  const { data: exact, error: exactError } = await supabase
    .from('orders')
    .select(PUBLIC_ORDER_SELECT)
    .eq('order_number', input)
    .maybeSingle()

  if (exactError) throw exactError
  if (exact) return exact as PublicOrderRow

  const digits = input.replace(/^SS-?/i, '').replace(/\D/g, '')
  if (!digits) return null

  const suffix = digits.slice(-4).padStart(4, '0')
  const year = new Date().getFullYear()
  const candidates = [`SS-${year}-${suffix}`, `SS-${year - 1}-${suffix}`]

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('orders')
      .select(PUBLIC_ORDER_SELECT)
      .eq('order_number', candidate)
      .maybeSingle()

    if (error) throw error
    if (data) return data as PublicOrderRow
  }

  const { data: rows, error: suffixError } = await supabase
    .from('orders')
    .select(PUBLIC_ORDER_SELECT)
    .ilike('order_number', `%-${suffix}`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (suffixError) throw suffixError
  if (!rows?.length) return null

  const list = rows as PublicOrderRow[]
  if (list.length === 1) return list[0]

  // Prefer the most recently created non-pending order when multiple share a suffix.
  const nonPending = list.find(row => row.status !== 'pending')
  return nonPending ?? list[0]
}
