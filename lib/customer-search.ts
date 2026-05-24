import { normalizePhoneDigits } from '@/lib/phone'

export function customerMatchesSearch(
  customer: { full_name: string; email?: string | null; phone?: string | null },
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const qDigits = normalizePhoneDigits(q)
  const phoneDigits = normalizePhoneDigits(customer.phone)
  return (
    customer.full_name.toLowerCase().includes(q) ||
    (customer.email ?? '').toLowerCase().includes(q) ||
    (customer.phone ?? '').toLowerCase().includes(q) ||
    (qDigits.length >= 3 && phoneDigits.includes(qDigits))
  )
}
