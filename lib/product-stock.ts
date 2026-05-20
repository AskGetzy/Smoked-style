import type { CartItem, Product } from '@/types'

export function isOutOfStock(product: Product): boolean {
  if (product.is_in_stock === false) return true
  if (
    product.stock_quantity !== null &&
    product.stock_quantity !== undefined &&
    product.stock_quantity <= 0
  ) {
    return true
  }
  return false
}

export type StockLineKey = {
  product_id: string
  selected_flavor?: string | null
  selected_weight?: number | null
  selected_size?: string | null
}

export function stockLineKey(line: StockLineKey): string {
  return [
    line.product_id,
    line.selected_flavor ?? '',
    line.selected_weight ?? '',
    line.selected_size ?? '',
  ].join('|')
}

export function matchesStockLine(
  item: Pick<CartItem, 'product_id' | 'selected_flavor' | 'selected_weight' | 'selected_size'>,
  key: StockLineKey,
): boolean {
  return (
    item.product_id === key.product_id &&
    (item.selected_flavor ?? null) === (key.selected_flavor ?? null) &&
    (item.selected_weight ?? null) === (key.selected_weight ?? null) &&
    (item.selected_size ?? null) === (key.selected_size ?? null)
  )
}

function parseFlavorStock(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    const n = Number(value)
    if (Number.isFinite(n)) out[key] = n
  }
  return out
}

/** Units available to sell (pieces, packs, or lbs for jerky by flavor). */
export function getAvailableStock(product: Product | null | undefined, flavor?: string | null): number {
  if (!product) return 0
  if (isOutOfStock(product)) return 0

  if (product.category === 'jerky' && flavor) {
    const flavorStock = parseFlavorStock(product.jerky_flavor_stock)
    if (flavor in flavorStock) {
      return Math.max(0, flavorStock[flavor])
    }
  }

  const stock = Number(product.stock_quantity)
  return Number.isFinite(stock) ? Math.max(0, stock) : 0
}

/** How much of the product this cart line consumes from inventory. */
export function getLineStockUsage(
  item: Pick<CartItem, 'quantity' | 'selected_weight'>,
  product: Product | null | undefined,
): number {
  if (!product) return 0
  if (product.category === 'jerky') {
    const weight = Number(item.selected_weight)
    if (Number.isFinite(weight) && weight > 0) return weight
  }
  return Math.max(0, Number(item.quantity) || 0)
}

/** Pool key: jerky shares stock by flavor; other lines use full variant key. */
export function stockPoolKey(product: Product | null | undefined, line: StockLineKey): string {
  if (product?.category === 'jerky') {
    return `${line.product_id}|${line.selected_flavor ?? ''}`
  }
  return stockLineKey(line)
}

export function getCartPoolUsage(
  cart: Array<Pick<CartItem, 'id' | 'product_id' | 'quantity' | 'selected_flavor' | 'selected_weight' | 'selected_size'>>,
  product: Product,
  poolKey: string,
  excludeItemId?: string,
): number {
  return cart
    .filter(item => {
      if (excludeItemId && item.id === excludeItemId) return false
      return stockPoolKey(product, item) === poolKey
    })
    .reduce((sum, item) => sum + getLineStockUsage(item, product), 0)
}

export function getRemainingStock(
  product: Product | null | undefined,
  cart: Array<Pick<CartItem, 'id' | 'product_id' | 'quantity' | 'selected_flavor' | 'selected_weight' | 'selected_size'>>,
  line: StockLineKey,
  excludeItemId?: string,
): number {
  if (!product) return 0
  const poolKey = stockPoolKey(product, line)
  const available = getAvailableStock(product, line.selected_flavor)
  const inCart = getCartPoolUsage(cart, product, poolKey, excludeItemId)
  return Math.max(0, available - inCart)
}

/** Max quantity (pieces/packs) or weight (jerky lb) for a single cart line. */
export function getMaxLineQuantity(
  product: Product,
  cart: Array<Pick<CartItem, 'id' | 'product_id' | 'quantity' | 'selected_flavor' | 'selected_weight' | 'selected_size'>>,
  line: StockLineKey,
  excludeItemId?: string,
): number {
  return getRemainingStock(product, cart, line, excludeItemId)
}

export function clampLineQuantity(
  product: Product | null | undefined,
  cart: Array<Pick<CartItem, 'id' | 'product_id' | 'quantity' | 'selected_flavor' | 'selected_weight' | 'selected_size'>>,
  line: StockLineKey,
  requested: number,
  excludeItemId?: string,
): number {
  if (!product) return 0
  const max = getMaxLineQuantity(product, cart, line, excludeItemId)
  if (max <= 0) return 0
  if (product.category === 'jerky') {
    return Math.min(requested, max)
  }
  return Math.max(1, Math.min(Math.floor(requested), Math.floor(max)))
}

export function formatStockLeft(product: Product, remaining: number): string | null {
  if (remaining <= 0) return null
  if (product.category === 'jerky') {
    return `${remaining} lb left`
  }
  const unit = product.sold_as === 'per_pack' ? 'pack' : 'pc'
  const plural = remaining === 1 ? unit : `${unit}s`
  return `${remaining} ${plural} left`
}

export function assertCartWithinStock(
  lines: Array<{
    product_id: string
    quantity: number
    selected_flavor: string | null
    selected_weight: number | null
    selected_size: string | null
  }>,
  productsById: Map<string, Product>,
): void {
  const poolUsage = new Map<string, number>()

  for (const line of lines) {
    const product = productsById.get(line.product_id)
    if (!product) throw new Error(`Product not found: ${line.product_id}`)
    if (isOutOfStock(product)) {
      throw new Error(`${product.name} is out of stock`)
    }

    const key = stockPoolKey(product, line)
    const demand = getLineStockUsage(
      { quantity: line.quantity, selected_weight: line.selected_weight },
      product,
    )
    if (demand <= 0) {
      throw new Error(`Invalid quantity for ${product.name}`)
    }

    const next = (poolUsage.get(key) ?? 0) + demand
    const available = getAvailableStock(product, line.selected_flavor)
    if (next > available) {
      const left = Math.max(0, available - (poolUsage.get(key) ?? 0))
      throw new Error(
        left > 0
          ? `Only ${left} available for ${product.name}`
          : `${product.name} is out of stock`,
      )
    }
    poolUsage.set(key, next)
  }
}
