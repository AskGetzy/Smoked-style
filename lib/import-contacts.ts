import { normalizePhoneDigits } from '@/lib/phone'

export type ImportContactRow = {
  full_name: string
  phone: string
  email: string
}

type ContactPickerResult = {
  name?: string[]
  tel?: string[]
  email?: string[]
}

declare global {
  interface Navigator {
    contacts?: {
      select: (
        properties: ('name' | 'email' | 'tel')[],
        options?: { multiple?: boolean },
      ) => Promise<ContactPickerResult[]>
    }
  }
}

export function canPickPhoneContacts(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof navigator.contacts?.select === 'function'
  )
}

export async function pickPhoneContacts(): Promise<ImportContactRow[]> {
  if (!canPickPhoneContacts()) {
    throw new Error('Contact picker is not supported on this device. Use Chrome on Android or import a file.')
  }

  const picked = await navigator.contacts!.select(['name', 'email', 'tel'], { multiple: true })
  return picked
    .map(contact => contactToRow(contact))
    .filter((row): row is ImportContactRow => row !== null)
}

function contactToRow(contact: ContactPickerResult): ImportContactRow | null {
  const full_name = (contact.name?.[0] ?? '').trim()
  const phone = pickBestPhone(contact.tel ?? [])
  const email = (contact.email?.[0] ?? '').trim().toLowerCase()

  if (!full_name || !phone) return null

  return {
    full_name,
    phone,
    email: email || placeholderEmail(phone),
  }
}

function pickBestPhone(numbers: string[]): string {
  const cleaned = numbers.map(n => n.trim()).filter(Boolean)
  return cleaned[0] ?? ''
}

export function placeholderEmail(phone: string): string {
  const digits = normalizePhoneDigits(phone)
  return digits ? `${digits}@import.local` : 'unknown@import.local'
}

export function parseContactsCsv(text: string): ImportContactRow[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const rows = lines.map(line => splitCsvLine(line, delimiter))
  const header = rows[0].map(cell => cell.toLowerCase().replace(/[^a-z0-9]/g, ''))

  const nameIdx = header.findIndex(h => ['name', 'fullname', 'customer', 'contact'].includes(h))
  const phoneIdx = header.findIndex(h =>
    ['phone', 'mobile', 'tel', 'telephone', 'cell', 'phonenumber'].includes(h),
  )
  const emailIdx = header.findIndex(h => ['email', 'emailaddress', 'mail'].includes(h))

  const hasHeader = nameIdx >= 0 || phoneIdx >= 0
  const dataRows = hasHeader ? rows.slice(1) : rows

  const nameColumn = hasHeader ? nameIdx : 0
  const phoneColumn = hasHeader ? phoneIdx : 1
  const emailColumn = hasHeader ? emailIdx : 2

  return dataRows
    .map(cells => {
      const full_name = (cells[nameColumn] ?? '').trim()
      const phone = (cells[phoneColumn] ?? cells[1] ?? '').trim()
      const email = (cells[emailColumn] ?? '').trim().toLowerCase()
      if (!full_name || !phone) return null
      return {
        full_name,
        phone,
        email: email || placeholderEmail(phone),
      }
    })
    .filter((row): row is ImportContactRow => row !== null)
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export function parseContactsVcard(text: string): ImportContactRow[] {
  const cards = text.split(/BEGIN:VCARD/i).slice(1)
  const rows: ImportContactRow[] = []

  for (const card of cards) {
    const full_name = readVcardField(card, 'FN') || readVcardField(card, 'N')?.replace(/;/g, ' ').trim() || ''
    const phone = readVcardField(card, 'TEL') || ''
    const email = readVcardField(card, 'EMAIL')?.toLowerCase() || ''

    if (!full_name.trim() || !phone.trim()) continue

    rows.push({
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email || placeholderEmail(phone),
    })
  }

  return rows
}

function readVcardField(card: string, key: string): string | null {
  const regex = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, 'im')
  const match = card.match(regex)
  return match?.[1]?.trim().replace(/\\n/g, ' ') ?? null
}

export function parseContactsFile(fileName: string, text: string): ImportContactRow[] {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.vcf') || text.includes('BEGIN:VCARD')) {
    return parseContactsVcard(text)
  }
  return parseContactsCsv(text)
}

export function isValidImportRow(row: ImportContactRow): boolean {
  return Boolean(row.full_name.trim()) && normalizePhoneDigits(row.phone).length >= 7
}
