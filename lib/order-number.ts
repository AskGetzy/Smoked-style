import type { SupabaseClient } from '@supabase/supabase-js'

function randomDigits(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 10)
  }
  return out
}

/**
 * Generates a non-sequential order number (SS-YYYY-XXXXXX, digits only).
 * Deliberately not based on a running count — a sequential/zero-padded
 * number lets anyone who receives one (e.g. a customer comparing two of
 * their own orders) infer how many orders the business has taken.
 * Uniqueness is enforced with a check-and-retry loop rather than a DB
 * constraint race.
 */
export async function generateOrderNumber(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear()

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `SS-${year}-${randomDigits(6)}`
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', candidate)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return candidate
  }

  throw new Error('Could not generate a unique order number')
}
