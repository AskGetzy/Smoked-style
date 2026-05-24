/** Digits-only phone for matching and storage helpers. */
export function normalizePhoneDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '')
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const da = normalizePhoneDigits(a)
  const db = normalizePhoneDigits(b)
  return da.length >= 7 && da === db
}
