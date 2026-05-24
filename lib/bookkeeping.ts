export const EXPENSE_CATEGORIES = [
  'Ingredients',
  'Packaging',
  'Rent',
  'Utilities',
  'Marketing',
  'Equipment',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export type DateRangePreset = 'week' | 'month' | 'custom'

export type BookkeepingDateRange = {
  preset: DateRangePreset
  start: string
  end: string
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function resolveDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): BookkeepingDateRange {
  const today = new Date()
  const end = toLocalDateString(today)

  if (preset === 'week') {
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 6)
    return { preset, start: toLocalDateString(startDate), end }
  }

  if (preset === 'month') {
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    return { preset, start: toLocalDateString(startDate), end }
  }

  return {
    preset: 'custom',
    start: customStart || end,
    end: customEnd || end,
  }
}

export function parseDateRangeFromSearchParams(searchParams: URLSearchParams): BookkeepingDateRange {
  const preset = (searchParams.get('preset') as DateRangePreset) || 'month'
  return resolveDateRange(preset, searchParams.get('start') ?? undefined, searchParams.get('end') ?? undefined)
}

export function orderIncomeDate(order: { created_at?: string; delivery_date?: string | null }): string {
  if (order.delivery_date) {
    const match = String(order.delivery_date).match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  if (order.created_at) return toLocalDateString(new Date(order.created_at))
  return toLocalDateString(new Date())
}

export function inDateRange(dateStr: string, range: BookkeepingDateRange): boolean {
  return dateStr >= range.start && dateStr <= range.end
}

export function weekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return toLocalDateString(monday)
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function escapeCsv(value: string | number | null | undefined): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCsv).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','))
  }
  return lines.join('\n')
}

export function toIifLine(fields: string[]): string {
  return fields.map(f => f.replace(/\t/g, ' ')).join('\t')
}
