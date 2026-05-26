import type { Product } from '@/types'
import { isValidJerkyWeight } from '@/lib/jerky-stock'
import {
  assertCartWithinStock,
  isOutOfStock,
  isWeightBasedProduct,
} from '@/lib/product-stock'

export type CheckoutCartLine = {
  product_id: string
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
}

export type PricedCartLine = CheckoutCartLine & {
  product_name: string
  unit_price: number
  line_total: number
  quantity: number
}

export function computeLineTotal(product: Product, line: CheckoutCartLine): PricedCartLine {
  if (isOutOfStock(product)) {
    throw new Error(`${product.name} is out of stock`)
  }

  if (isWeightBasedProduct(product)) {
    const weight = line.selected_weight
    if (weight == null || weight <= 0) {
      throw new Error(`Weight is required for ${product.name}`)
    }
    if (product.category === 'jerky' && !isValidJerkyWeight(weight)) {
      throw new Error(`Weight must be between 0.25 lb and 4 lb for ${product.name}`)
    }
    if (
      product.flavors?.length &&
      line.selected_flavor &&
      !product.flavors.includes(line.selected_flavor)
    ) {
      throw new Error(`Invalid flavor for ${product.name}`)
    }
    if (
      product.category !== 'jerky' &&
      product.weight_options?.length &&
      !product.weight_options.includes(weight)
    ) {
      throw new Error(`Invalid weight for ${product.name}`)
    }
    const unit_price = product.price * weight
    const quantity = Math.max(1, Math.floor(line.quantity || 1))
    return {
      ...line,
      product_name: product.name,
      quantity,
      unit_price,
      line_total: unit_price * quantity,
    }
  }

  const quantity = Math.max(1, Math.floor(line.quantity || 1))

  return {
    ...line,
    product_name: product.name,
    quantity,
    unit_price: product.price,
    line_total: product.price * quantity,
  }
}

export function priceCartLines(
  lines: CheckoutCartLine[],
  productsById: Map<string, Product>,
): PricedCartLine[] {
  if (lines.length === 0) {
    throw new Error('Cart is empty')
  }

  assertCartWithinStock(lines, productsById)

  return lines.map((line) => {
    const product = productsById.get(line.product_id)
    if (!product) {
      throw new Error(`Product not found: ${line.product_id}`)
    }
    return computeLineTotal(product, line)
  })
}

export function sumSubtotal(priced: PricedCartLine[]): number {
  return priced.reduce((sum, line) => sum + line.line_total, 0)
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function amountsMatch(dollars: number, cents: number): boolean {
  return toCents(dollars) === cents
}
