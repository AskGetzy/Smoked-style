/** Calendar date in the user's local timezone as YYYY-MM-DD. */
export function toLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayLocal() {
  return toLocalDateString(new Date())
}

/** Parse a date-only or timestamp value to a local calendar date string. */
export function normalizeDeliveryDate(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/** Parse YYYY-MM-DD as local noon to avoid DST/UTC display shifts. */
export function parseLocalDate(value: string) {
  const normalized = normalizeDeliveryDate(value)
  if (!normalized) return new Date(Number.NaN)
  return new Date(`${normalized}T12:00:00`)
}

export function addLocalDays(date: string, days: number) {
  const next = parseLocalDate(date)
  next.setDate(next.getDate() + days)
  return toLocalDateString(next)
}

export function formatDeliveryDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  },
) {
  const normalized = normalizeDeliveryDate(value)
  if (!normalized) return ''
  const date = parseLocalDate(normalized)
  if (Number.isNaN(date.getTime())) return value ?? ''
  return date.toLocaleDateString('en-US', options)
}

export function isCreatedOnLocalDate(createdAt: string, localDate: string) {
  return toLocalDateString(new Date(createdAt)) === localDate
}
