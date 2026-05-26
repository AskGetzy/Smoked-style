import type { SupabaseClient } from '@supabase/supabase-js'

type OrderItem = {
  product_id: string | null
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
}

type ProductRow = {
  category: string
  sold_as: string
  stock_quantity: number | null
  jerky_flavor_stock: Record<string, number> | null
}

import { parseJerkyFlavorStock } from '@/lib/jerky-stock'

function deductAmount(item: OrderItem, product: ProductRow): number {
  if (product.sold_as === 'per_lb') {
    const weight = Number(item.selected_weight)
    const quantity = Math.max(1, Number(item.quantity) || 1)
    if (Number.isFinite(weight) && weight > 0) return weight * quantity
  }
  return Number(item.quantity) || 0
}

export async function deductInventoryOnApproval(
  supabase: SupabaseClient,
  orderId: string,
  orderNumber: string,
  changedBy?: string | null,
) {
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity, selected_flavor, selected_weight')
    .eq('order_id', orderId)

  if (itemsError) throw new Error(itemsError.message)

  for (const item of orderItems ?? []) {
    if (!item.product_id) continue

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('category, sold_as, stock_quantity, jerky_flavor_stock')
      .eq('id', item.product_id)
      .single()

    if (productError || !product) continue

    const row = product as ProductRow
    const amount = deductAmount(item as OrderItem, row)
    if (amount <= 0) continue

    const reason = `Order ${orderNumber} approved`

    if (row.category === 'jerky' && item.selected_flavor) {
      const flavorStock = parseJerkyFlavorStock(row.jerky_flavor_stock)
      const flavor = item.selected_flavor
      const previous = Number(flavorStock[flavor] ?? row.stock_quantity ?? 0)
      const next = Math.max(0, previous - amount)

      flavorStock[flavor] = next

      const { error: updateError } = await supabase
        .from('products')
        .update({ jerky_flavor_stock: flavorStock })
        .eq('id', item.product_id)

      if (updateError) throw new Error(updateError.message)

      const { error: historyError } = await supabase.from('stock_history').insert({
        product_id: item.product_id,
        changed_by: changedBy ?? null,
        change_amount: -amount,
        previous_quantity: previous,
        new_quantity: next,
        reason,
      })

      if (historyError) throw new Error(historyError.message)
      continue
    }

    const previous = Number(row.stock_quantity ?? 0)
    const next = Math.max(0, previous - amount)

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: next })
      .eq('id', item.product_id)

    if (updateError) throw new Error(updateError.message)

    const { error: historyError } = await supabase.from('stock_history').insert({
      product_id: item.product_id,
      changed_by: changedBy ?? null,
      change_amount: -amount,
      previous_quantity: previous,
      new_quantity: next,
      reason,
    })

    if (historyError) throw new Error(historyError.message)
  }
}
