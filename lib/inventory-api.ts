import type { Product } from '@/types'

type StockHistoryInput = {
  change_amount: number
  previous_quantity: number
  new_quantity: number
  reason: string
}

export async function patchProductInventory(
  productId: string,
  patch: Partial<
    Pick<
      Product,
      | 'price'
      | 'is_in_stock'
      | 'stock_quantity'
      | 'jerky_flavor_stock'
      | 'jerky_flavor_thresholds'
      | 'image_url'
    >
  >,
  stockHistory?: StockHistoryInput,
): Promise<{ product?: Product; error?: string }> {
  const res = await fetch('/api/admin/inventory/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productId, patch, stockHistory }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { error: payload.error ?? 'Could not save inventory' }
  }
  return { product: payload.product as Product }
}
