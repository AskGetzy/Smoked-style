/** Match admin/boss order search: numeric queries use suffix (001 → -0001), not substring. */
export function orderMatchesNumberSearch(orderNumber: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const on = orderNumber.trim().toLowerCase()
  const digits = q.replace(/^ss-?/i, '').replace(/\D/g, '')

  if (digits.length > 0) {
    const suffix = digits.slice(-4).padStart(4, '0')
    if (on.endsWith(`-${suffix}`)) return true

    const year = new Date().getFullYear()
    for (let i = 0; i < 5; i++) {
      if (on === `ss-${year - i}-${suffix}`) return true
    }

    if (q.startsWith('ss') && on.includes(q.replace(/\s/g, ''))) return true
    return false
  }

  return on.includes(q)
}
