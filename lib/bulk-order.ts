import { rowsToCsv } from '@/lib/bookkeeping'
import { normalizeDeliveryDate } from '@/lib/dates'
import { isCustomerVisible, isOutOfStock, isWeightBasedProduct } from '@/lib/product-stock'
import type { DeliveryArea, Product } from '@/types'

export const BULK_ORDER_TEMPLATE_HEADERS = [
  'Recipient Name',
  'Recipient Phone',
  'Recipient Email',
  'Product Name',
  'Flavor',
  'Weight (lb)',
  'Size',
  'Quantity',
  'Order Type',
  'Delivery Area',
  'Address',
  'Delivery Date (YYYY-MM-DD)',
  'Notes',
  'Gift Message',
] as const

export type BulkOrderPaymentMethod = 'payment_link' | 'cash' | 'check' | 'card_on_file'

export type BulkRecipientDraft = {
  rowNumber: number
  recipient_name: string
  recipient_phone: string
  recipient_email: string
  product_name: string
  flavor: string
  weight: string
  size: string
  quantity: string
  order_type: string
  delivery_area: string
  address: string
  delivery_date: string
  notes: string
  gift_message: string
}

export type BulkRecipientInput = {
  rowNumber: number
  recipient_name: string
  recipient_phone: string | null
  recipient_email: string | null
  product_id: string
  product_name: string
  flavor: string | null
  weight: number | null
  size: string | null
  quantity: number
  unit_price: number
  order_type: 'pickup' | 'delivery'
  delivery_area_id: string | null
  delivery_area: string | null
  address: string | null
  delivery_date: string
  notes: string | null
  gift_message: string | null
  line_total: number
}

export type BulkRecipientRow = BulkRecipientInput & {
  skipped: boolean
  errors: string[]
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
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

function headerKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const HEADER_ALIASES: Record<keyof Omit<BulkRecipientDraft, 'rowNumber'>, string[]> = {
  recipient_name: ['recipientname', 'name'],
  recipient_phone: ['recipientphone', 'phone', 'phonenumber'],
  recipient_email: ['recipientemail', 'email', 'emailaddress'],
  product_name: ['productname', 'itemname'],
  flavor: ['flavor'],
  weight: ['weightlb', 'weight'],
  size: ['size'],
  quantity: ['quantity', 'qty'],
  order_type: ['ordertype', 'type'],
  delivery_area: ['deliveryarea', 'area'],
  address: ['address', 'deliveryaddress'],
  delivery_date: ['deliverydateyyyymmdd', 'deliverydate'],
  notes: ['notes', 'specialnotes'],
  gift_message: ['giftmessage'],
}

export function parseBulkOrderCsv(text: string): BulkRecipientDraft[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const rows = lines.map(line => splitCsvLine(line, delimiter))
  const header = rows[0].map(headerKey)

  const indices = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([key, aliases]) => [
      key,
      header.findIndex(cell => aliases.includes(cell)),
    ]),
  ) as Record<keyof Omit<BulkRecipientDraft, 'rowNumber'>, number>

  const hasHeader = Object.values(indices).some(index => index >= 0)
  const dataRows = hasHeader ? rows.slice(1) : rows

  return dataRows.map((cells, index) => {
    const read = (field: keyof Omit<BulkRecipientDraft, 'rowNumber'>, fallback: number) =>
      (cells[hasHeader && indices[field] >= 0 ? indices[field] : fallback] ?? '').trim()

    return {
      rowNumber: index + (hasHeader ? 2 : 1),
      recipient_name: read('recipient_name', 0),
      recipient_phone: read('recipient_phone', 1),
      recipient_email: read('recipient_email', 2),
      product_name: read('product_name', 3),
      flavor: read('flavor', 4),
      weight: read('weight', 5),
      size: read('size', 6),
      quantity: read('quantity', 7),
      order_type: read('order_type', 8),
      delivery_area: read('delivery_area', 9),
      address: read('address', 10),
      delivery_date: read('delivery_date', 11),
      notes: read('notes', 12),
      gift_message: read('gift_message', 13),
    }
  })
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function findProduct(products: Product[], productName: string) {
  const name = productName.trim().toLowerCase()
  return products.find(product => product.name.trim().toLowerCase() === name) ?? null
}

function findDeliveryArea(areas: DeliveryArea[], areaName: string) {
  const name = areaName.trim().toLowerCase()
  return areas.find(area => area.name.trim().toLowerCase() === name) ?? null
}

function linePrice(product: Product, weight: number | null, quantity: number) {
  if (isWeightBasedProduct(product)) {
    return product.price * (weight ?? 0) * quantity
  }
  return product.price * quantity
}

export function validateBulkRecipientRows(
  rows: BulkRecipientDraft[],
  products: Product[],
  areas: DeliveryArea[],
): { rows: BulkRecipientRow[]; validRows: BulkRecipientInput[]; errors: string[] } {
  const validated: BulkRecipientRow[] = []
  const errors: string[] = []

  for (const row of rows) {
    const rowErrors: string[] = []
    const product = findProduct(products, row.product_name)
    const orderType = row.order_type.trim().toLowerCase() === 'pickup' ? 'pickup' : 'delivery'
    const quantity = Number.parseInt(row.quantity || '1', 10)
    const weight = row.weight.trim() ? Number(row.weight) : null
    const deliveryDate = normalizeDeliveryDate(row.delivery_date)
    const area = row.delivery_area.trim() ? findDeliveryArea(areas, row.delivery_area) : null

    if (!row.recipient_name.trim()) rowErrors.push('Recipient name is required')
    if (row.recipient_email.trim() && !looksLikeEmail(row.recipient_email.trim().toLowerCase())) {
      rowErrors.push('Recipient email must be a valid email address')
    }
    if (!product) {
      rowErrors.push('Product not found')
    } else {
      if (!isCustomerVisible(product)) rowErrors.push('Product is hidden')
      if (isOutOfStock(product)) rowErrors.push('Product is out of stock')
      if (product.flavors?.length) {
        if (!row.flavor.trim()) rowErrors.push('Flavor is required for this product')
        else if (!product.flavors.some(flavor => flavor.toLowerCase() === row.flavor.trim().toLowerCase())) {
          rowErrors.push('Flavor is not available for this product')
        }
      }
      if (isWeightBasedProduct(product)) {
        if (weight == null || !Number.isFinite(weight) || weight <= 0) {
          rowErrors.push('Weight must be a positive number for this product')
        }
      }
    }

    if (!Number.isFinite(quantity) || quantity <= 0) rowErrors.push('Quantity must be a whole number greater than 0')
    if (!deliveryDate) rowErrors.push('Delivery date must use YYYY-MM-DD')
    if (orderType === 'delivery') {
      if (!area) rowErrors.push('Delivery area must match an existing area')
      if (!row.address.trim()) rowErrors.push('Address is required for delivery rows')
    }

    const unitPrice =
      product == null
        ? 0
        : isWeightBasedProduct(product)
          ? product.price * (weight ?? 0)
          : product.price

    const line_total = product == null ? 0 : linePrice(product, weight, quantity)
    const validRow: BulkRecipientRow = {
      rowNumber: row.rowNumber,
      recipient_name: row.recipient_name.trim(),
      recipient_phone: row.recipient_phone.trim() || null,
      recipient_email: row.recipient_email.trim().toLowerCase() || null,
      product_id: product?.id ?? '',
      product_name: product?.name ?? row.product_name.trim(),
      flavor: row.flavor.trim() || null,
      weight: weight == null || !Number.isFinite(weight) ? null : weight,
      size: row.size.trim() || product?.size_label || null,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit_price: Number(unitPrice.toFixed(2)),
      order_type: orderType,
      delivery_area_id: area?.id ?? null,
      delivery_area: area?.name ?? (row.delivery_area.trim() || null),
      address: row.address.trim() || null,
      delivery_date: deliveryDate ?? row.delivery_date.trim(),
      notes: row.notes.trim() || null,
      gift_message: row.gift_message.trim() || null,
      line_total: Number(line_total.toFixed(2)),
      skipped: rowErrors.length > 0,
      errors: rowErrors,
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${row.rowNumber}: ${rowErrors.join(', ')}`)
    }

    validated.push(validRow)
  }

  return {
    rows: validated,
    validRows: validated.filter(row => !row.skipped),
    errors,
  }
}

export function buildBulkOrderTemplateCsv() {
  return rowsToCsv([...BULK_ORDER_TEMPLATE_HEADERS], [])
}

export function bulkOrderTotal(rows: Array<Pick<BulkRecipientInput, 'line_total'>>) {
  return rows.reduce((sum, row) => sum + Number(row.line_total || 0), 0)
}
