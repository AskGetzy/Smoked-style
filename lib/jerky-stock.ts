import type { Product } from '@/types'

/** Default jerky flavors when product.flavors is empty. */
export const JERKY_FLAVOR_NAMES = [
  'General Tso',
  'Sweet And Spicy',
  'Jalapeno',
  'Pepper Crust',
  'BBQ',
  'Teriyaki',
] as const

export function parseJerkyFlavorStock(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    const n = Number(value)
    if (Number.isFinite(n)) out[key] = n
  }
  return out
}

export function parseJerkyFlavorThresholds(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    const n = Number(value)
    if (Number.isFinite(n)) out[key] = n
  }
  return out
}

export function getJerkyFlavors(product: Product): string[] {
  if (product.flavors?.length) return product.flavors
  const fromStock = Object.keys(parseJerkyFlavorStock(product.jerky_flavor_stock))
  if (fromStock.length) return fromStock
  return [...JERKY_FLAVOR_NAMES]
}

export function getJerkyFlavorStock(product: Product, flavor: string): number {
  const stock = parseJerkyFlavorStock(product.jerky_flavor_stock)
  if (flavor in stock) return Math.max(0, stock[flavor])
  return 0
}

export function getJerkyFlavorThreshold(product: Product, flavor: string): number {
  const thresholds = parseJerkyFlavorThresholds(product.jerky_flavor_thresholds)
  if (flavor in thresholds) return Math.max(0, thresholds[flavor])
  return Number(product.low_stock_threshold) || 0
}

export function isJerkyFlavorAvailable(product: Product, flavor: string | null | undefined): boolean {
  if (!product.is_in_stock) return false
  if (!flavor) return false
  return getJerkyFlavorStock(product, flavor) > 0
}

export function isJerkyFlavorLowStock(product: Product, flavor: string): boolean {
  const stock = getJerkyFlavorStock(product, flavor)
  const threshold = getJerkyFlavorThreshold(product, flavor)
  return stock > 0 && stock <= threshold
}

/** True when every flavor is at or below zero. */
export function isJerkyProductOutOfStock(product: Product): boolean {
  if (!product.is_in_stock) return true
  const flavors = getJerkyFlavors(product)
  if (flavors.length === 0) {
    return Number(product.stock_quantity) <= 0
  }
  return flavors.every(flavor => getJerkyFlavorStock(product, flavor) <= 0)
}

export function getFirstAvailableJerkyFlavor(product: Product): string | null {
  for (const flavor of getJerkyFlavors(product)) {
    if (isJerkyFlavorAvailable(product, flavor)) return flavor
  }
  return null
}
