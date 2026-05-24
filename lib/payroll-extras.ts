export const EXTRA_PAY_PRESETS = ['Overtime', 'Taxi', 'Bonus', 'Tips', 'Other'] as const

export type ExtraPayLine = {
  description: string
  amount: number
}

export function parsePayrollExtras(raw: unknown): ExtraPayLine[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const amount = Number(row.amount)
      const description = String(row.description ?? '').trim()
      if (!description || !Number.isFinite(amount) || amount <= 0) return null
      return { description, amount }
    })
    .filter((line): line is ExtraPayLine => line !== null)
}

export function extrasTotal(extras: ExtraPayLine[]): number {
  return extras.reduce((sum, line) => sum + line.amount, 0)
}

export function computeHourlyBasePay(hours: number, hourlyRate: number): number {
  if (!Number.isFinite(hours) || !Number.isFinite(hourlyRate) || hours <= 0) return 0
  return Math.round(hours * hourlyRate * 100) / 100
}

export function computeEntryBasePay(
  payType: string,
  hoursWorked: number | null,
  hourlyRate: number,
  amountPaid: number,
  extras: ExtraPayLine[],
): number {
  if (payType === 'hourly' && hoursWorked != null && hoursWorked > 0) {
    return computeHourlyBasePay(hoursWorked, hourlyRate)
  }
  return Math.max(0, amountPaid - extrasTotal(extras))
}

export function emptyExtraLine(): ExtraPayLine {
  return { description: 'Overtime', amount: 0 }
}
