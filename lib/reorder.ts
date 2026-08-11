import type { CartItem, Product } from '@/types'
import type { PublicOrderItem } from '@/lib/order-tracking'
import { computeLineTotal } from '@/lib/checkout-pricing'
import { isCustomerVisible, isOutOfStock } from '@/lib/product-stock'

export type ReorderResult = {
  added: CartItem[]
  skipped: string[]
}

/**
 * Matches a past order's line items back to live products by name, since the
 * public order-status payload deliberately omits product_id. Items whose
 * product no longer exists, is hidden, or is out of stock are skipped rather
 * than failing the whole reorder.
 */
export function buildReorderCartItems(
  items: PublicOrderItem[],
  products: Product[],
): ReorderResult {
  const added: CartItem[] = []
  const skipped: string[] = []

  for (const item of items) {
    const product = products.find(
      p => p.name.toLowerCase() === item.product_name.toLowerCase(),
    )

    if (!product || !isCustomerVisible(product) || isOutOfStock(product)) {
      skipped.push(item.product_name)
      continue
    }

    try {
      const priced = computeLineTotal(product, {
        product_id: product.id,
        quantity: item.quantity,
        selected_flavor: item.selected_flavor,
        selected_weight: item.selected_weight,
        selected_size: item.selected_size,
      })

      added.push({
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        price: product.price,
        quantity: priced.quantity,
        selected_flavor: priced.selected_flavor,
        selected_weight: priced.selected_weight,
        selected_size: priced.selected_size,
        unit_price: priced.unit_price,
        line_total: priced.line_total,
        image_url: product.image_url,
      })
    } catch {
      skipped.push(item.product_name)
    }
  }

  return { added, skipped }
}

export function mergeCartItems(existing: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = [...existing]

  for (const item of incoming) {
    const matchIndex = merged.findIndex(
      i =>
        i.product_id === item.product_id &&
        i.selected_flavor === item.selected_flavor &&
        i.selected_weight === item.selected_weight &&
        i.selected_size === item.selected_size,
    )

    if (matchIndex >= 0) {
      const combinedQty = merged[matchIndex].quantity + item.quantity
      merged[matchIndex] = {
        ...merged[matchIndex],
        quantity: combinedQty,
        line_total: combinedQty * merged[matchIndex].unit_price,
      }
    } else {
      merged.push(item)
    }
  }

  return merged
}
