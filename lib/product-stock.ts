import type { Product } from '@/types'

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
