/** Digits-only phone for matching and storage helpers. */
export function normalizePhoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '')
}

/** Format US phone numbers as the user types. */
export function formatPhoneInput(value: string): string {
  const digits = normalizePhoneDigits(value).slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const da = normalizePhoneDigits(a)
  const db = normalizePhoneDigits(b)
  return da.length >= 7 && da === db
}
