import type { Product } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  jerky: 'Jerky',
  steaks: 'Steaks',
  smoked: 'Smoked',
  non_smoked: 'Non-Smoked',
  boards: 'Boards',
}

const BOARD_GROUP_ORDER = ['jerky', 'meat', 'steak'] as const
const BOARD_GROUP_LABELS: Record<(typeof BOARD_GROUP_ORDER)[number], string> = {
  jerky: 'Jerky',
  meat: 'Meat',
  steak: 'Steak',
}

export function formatPrice(product: Product): string {
  switch (product.sold_as) {
    case 'per_lb':
      return `$${product.price}/lb`
    case 'per_pack':
      return `$${product.price}/pack`
    case 'per_pan':
      return `$${product.price}/pan`
    case 'per_board':
      return `$${product.price}`
    default:
      return `$${product.price}`
  }
}

export function compareProductsInquiryLast(a: Product, b: Product): number {
  const aInquiry = Boolean(a.customer_inquiry_only)
  const bInquiry = Boolean(b.customer_inquiry_only)
  if (aInquiry === bInquiry) return 0
  return aInquiry ? 1 : -1
}

export function compareProductsPriceAsc(a: Product, b: Product): number {
  return compareProductsInquiryLast(a, b) || a.price - b.price
}

function variantFamilyKey(product: Product): string | null {
  if (!product.subcategory) return null
  if (product.category === 'boards') return null
  return `${product.category}:${product.subcategory}`
}

export function collapseVariantProducts(products: Product[]): Product[] {
  const byKey = new Map<string, Product>()

  for (const product of products) {
    const key = variantFamilyKey(product) ?? product.id
    const existing = byKey.get(key)

    if (!existing) {
      byKey.set(key, product)
      continue
    }

    if (Number(product.price) < Number(existing.price)) {
      byKey.set(key, product)
    }
  }

  return Array.from(byKey.values())
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace('_', ' ')
}

export function getProductVariants(product: Product, products: Product[]): Product[] {
  if (!product.subcategory) return [product]
  const variants = products.filter(
    p => p.category === product.category && p.subcategory === product.subcategory
  )
  if (variants.length <= 1) return [product]
  return [...variants].sort((a, b) =>
    (a.size_label ?? a.name).localeCompare(b.size_label ?? b.name, undefined, { numeric: true }),
  )
}

export type BoardGroup = {
  id: (typeof BOARD_GROUP_ORDER)[number]
  label: string
  products: Product[]
}

function getBoardGroupId(product: Product): (typeof BOARD_GROUP_ORDER)[number] {
  switch (product.subcategory) {
    case 'jerky_board':
    case 'carpaccio':
      return 'jerky'
    case 'steak_board':
      return 'steak'
    default:
      return 'meat'
  }
}

export function groupBoardProducts(products: Product[]): BoardGroup[] {
  const grouped = new Map<(typeof BOARD_GROUP_ORDER)[number], Product[]>()

  for (const product of products) {
    const groupId = getBoardGroupId(product)
    const list = grouped.get(groupId) ?? []
    list.push(product)
    grouped.set(groupId, list)
  }

  return BOARD_GROUP_ORDER
    .map(id => ({
      id,
      label: BOARD_GROUP_LABELS[id],
      products: [...(grouped.get(id) ?? [])].sort(compareProductsPriceAsc),
    }))
    .filter(group => group.products.length > 0)
}
