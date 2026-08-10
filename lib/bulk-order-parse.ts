import type { DeliveryArea, Product } from '@/types'
import { computeLineTotal } from '@/lib/checkout-pricing'
import { isCustomerVisible, isOutOfStock } from '@/lib/product-stock'

export const BULK_UPLOAD_COLUMNS = [
  'Customer Name',
  'Phone',
  'Email',
  'Product Name',
  'Flavor',
  'Weight (lb)',
  'Size',
  'Quantity',
  'Order Type (pickup/delivery)',
  'Delivery Area',
  'Address',
  'Delivery Date (YYYY-MM-DD)',
  'Notes',
  'Gift Message',
] as const

export type RawBulkRow = Record<string, string>

export type ParsedBulkRow = {
  rowNumber: number
  raw: RawBulkRow
  full_name: string
  phone: string
  email: string | null
  product_id: string
  product_name: string
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
  quantity: number
  unit_price: number
  line_total: number
  order_type: 'pickup' | 'delivery'
  delivery_area_id: string | null
  delivery_fee: number
  address: string | null
  delivery_date: string
  notes: string | null
  gift_message: string | null
}

export type BulkRowError = {
  rowNumber: number
  message: string
}

export type BulkParseResult = {
  rows: ParsedBulkRow[]
  errors: BulkRowError[]
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const HEADER_ALIASES: Record<string, string> = {
  'customer name': 'customer_name',
  name: 'customer_name',
  phone: 'phone',
  'phone number': 'phone',
  email: 'email',
  'product name': 'product_name',
  product: 'product_name',
  flavor: 'flavor',
  'weight lb': 'weight',
  weight: 'weight',
  size: 'size',
  quantity: 'quantity',
  qty: 'quantity',
  'order type pickup delivery': 'order_type',
  'order type': 'order_type',
  'delivery area': 'delivery_area',
  area: 'delivery_area',
  address: 'address',
  'delivery date yyyy mm dd': 'delivery_date',
  'delivery date': 'delivery_date',
  date: 'delivery_date',
  notes: 'notes',
  'gift message': 'gift_message',
}

/** Parses a small RFC4180-ish CSV: handles quoted fields, escaped quotes, and commas/newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

export function rowsToObjects(table: string[][]): RawBulkRow[] {
  if (table.length === 0) return []
  const headerRow = table[0].map(normalizeHeader)
  const keys = headerRow.map(h => HEADER_ALIASES[h] ?? h)

  return table.slice(1).map(row => {
    const obj: RawBulkRow = {}
    keys.forEach((key, i) => {
      obj[key] = (row[i] ?? '').trim()
    })
    return obj
  })
}

function normalizeDateInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (usMatch) {
    const [, m, d, y] = usMatch
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

export function parseBulkOrderRows(
  rawRows: RawBulkRow[],
  products: Product[],
  deliveryAreas: DeliveryArea[],
): BulkParseResult {
  const rows: ParsedBulkRow[] = []
  const errors: BulkRowError[] = []

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2 // header is row 1
    try {
      const full_name = String(raw.customer_name || '').trim()
      const phone = String(raw.phone || '').trim()
      const email = String(raw.email || '').trim().toLowerCase() || null
      const productName = String(raw.product_name || '').trim()
      const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1))
      const orderTypeRaw = String(raw.order_type || '').trim().toLowerCase()
      const address = String(raw.address || '').trim() || null
      const notes = String(raw.notes || '').trim() || null
      const giftMessage = String(raw.gift_message || '').trim() || null
      const flavor = String(raw.flavor || '').trim() || null
      const size = String(raw.size || '').trim() || null
      const weightRaw = String(raw.weight || '').trim()
      const weight = weightRaw ? Number(weightRaw) : null

      if (!full_name) throw new Error('Customer Name is required')
      if (!phone) throw new Error('Phone is required')
      if (!productName) throw new Error('Product Name is required')

      const orderType = orderTypeRaw === 'pickup' ? 'pickup' : orderTypeRaw === 'delivery' ? 'delivery' : null
      if (!orderType) throw new Error('Order Type must be "pickup" or "delivery"')
      if (orderType === 'delivery' && !address) throw new Error('Address is required for delivery orders')

      let delivery_area_id: string | null = null
      let delivery_fee = 0
      if (orderType === 'delivery') {
        const areaName = String(raw.delivery_area || '').trim()
        if (!areaName) throw new Error('Delivery Area is required for delivery orders')
        const area = deliveryAreas.find(
          a => a.name.toLowerCase() === areaName.toLowerCase() && a.is_active,
        )
        if (!area) throw new Error(`Delivery area "${areaName}" not found or inactive`)
        delivery_area_id = area.id
        delivery_fee = Number(area.delivery_fee)
      }

      const delivery_date = normalizeDateInput(String(raw.delivery_date || ''))
      if (!delivery_date) throw new Error('Delivery Date is missing or not a valid date')

      const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase())
      if (!product) throw new Error(`Product "${productName}" not found in catalog`)
      if (!isCustomerVisible(product)) throw new Error(`Product "${productName}" is not currently available`)
      if (isOutOfStock(product)) throw new Error(`Product "${productName}" is out of stock`)

      const priced = computeLineTotal(product, {
        product_id: product.id,
        quantity,
        selected_flavor: flavor,
        selected_weight: weight != null && Number.isFinite(weight) ? weight : null,
        selected_size: size,
      })

      rows.push({
        rowNumber,
        raw,
        full_name,
        phone,
        email,
        product_id: product.id,
        product_name: product.name,
        selected_flavor: priced.selected_flavor,
        selected_weight: priced.selected_weight,
        selected_size: priced.selected_size,
        quantity: priced.quantity,
        unit_price: priced.unit_price,
        line_total: priced.line_total,
        order_type: orderType,
        delivery_area_id,
        delivery_fee,
        address: orderType === 'delivery' ? address : null,
        delivery_date,
        notes,
        gift_message: giftMessage,
      })
    } catch (e: unknown) {
      errors.push({
        rowNumber,
        message: e instanceof Error ? e.message : 'Could not parse this row',
      })
    }
  })

  return { rows, errors }
}

export function buildBulkUploadTemplateCsv(): string {
  const header = BULK_UPLOAD_COLUMNS.join(',')
  const example = [
    'Jane Cohen',
    '5551234567',
    'jane@example.com',
    'Beef Jerky',
    'Original',
    '1',
    '',
    '2',
    'pickup',
    '',
    '',
    '2026-03-01',
    'Leave at front desk',
    'Happy Purim!',
  ].join(',')
  return `${header}\n${example}\n`
}
