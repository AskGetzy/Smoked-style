import { displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'

export type ProductionLineItem = {
  product_name: string
  quantity: number
  selected_flavor?: string | null
  selected_weight?: number | null
  selected_size?: string | null
}

export type ProductionOrderRow = {
  orderId: string
  orderNumber: string
  customerName: string
  phone: string | null
  quantity: number
  deliveryArea: string
  deliveryDate: string
}

/** Must match admin production tally keys. */
export function adminProductionItemKey(item: ProductionLineItem) {
  return [item.product_name, item.selected_flavor, item.selected_weight && `${item.selected_weight}lb`]
    .filter(Boolean)
    .join(' — ')
}

/** Must match boss production tally keys. */
export function bossProductionItemKey(item: ProductionLineItem) {
  return [
    item.product_name,
    item.selected_flavor,
    item.selected_weight && `${item.selected_weight} lb`,
    item.selected_size,
  ]
    .filter(Boolean)
    .join(' — ')
}

export function productionItemQuantity(item: ProductionLineItem) {
  return item.selected_weight ? item.quantity * item.selected_weight : item.quantity
}

export function tallyProductionItems(
  items: ProductionLineItem[],
  keyFn: (item: ProductionLineItem) => string,
) {
  const map: Record<string, { qty: number; unit: string }> = {}
  items.forEach(item => {
    const key = keyFn(item)
    const unit = item.selected_weight ? 'lb' : 'pcs'
    const qty = productionItemQuantity(item)
    if (!map[key]) map[key] = { qty: 0, unit }
    map[key].qty += qty
  })
  return Object.entries(map).map(([name, value]) => ({ name, ...value }))
}

type OrderWithItems = {
  id: string
  order_number: string
  delivery_date?: string | null
  buyer_name?: string | null
  buyer_phone?: string | null
  customers?: { full_name?: string | null; phone?: string | null } | null
  delivery_areas?: { name?: string | null } | null
  order_items?: ProductionLineItem[] | null
}

export function ordersContainingProduct(
  orders: OrderWithItems[],
  productKey: string,
  keyFn: (item: ProductionLineItem) => string,
): ProductionOrderRow[] {
  const rows: ProductionOrderRow[] = []

  orders.forEach(order => {
    const matching = (order.order_items ?? []).filter(item => keyFn(item) === productKey)
    if (matching.length === 0) return

    const quantity = matching.reduce((sum, item) => sum + productionItemQuantity(item), 0)
    rows.push({
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: displayBuyerName(order),
      phone: displayBuyerPhone(order),
      quantity,
      deliveryArea: order.delivery_areas?.name ?? '—',
      deliveryDate: order.delivery_date ?? '—',
    })
  })

  return rows
}
