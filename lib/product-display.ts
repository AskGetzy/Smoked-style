import type { Product } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  jerky: 'Jerky',
  steaks: 'Steaks',
  smoked: 'Smoked',
  non_smoked: 'Non-Smoked',
  boards: 'Boards',
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

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace('_', ' ')
}

export function getBoardVariants(product: Product, products: Product[]): Product[] {
  if (product.category !== 'boards' || !product.subcategory) return [product]
  const variants = products.filter(
    p => p.category === 'boards' && p.subcategory === product.subcategory
  )
  if (variants.length <= 1) return [product]
  return [...variants].sort((a, b) => (a.size_label ?? '').localeCompare(b.size_label ?? ''))
}
