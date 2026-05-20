import type { Product } from '@/types'

const PLACEHOLDER_EMOJI: Record<string, string> = {
  jerky: '🥩',
  boards: '🪵',
  steaks: '🥩',
  smoked: '🍖',
  non_smoked: '🍖',
}

type Props = {
  product: Product
  className?: string
  rounded?: 'top' | 'top-lg' | 'none'
}

export default function ProductImage({ product, className = 'h-48', rounded = 'top' }: Props) {
  const roundedClass =
    rounded === 'top' ? 'rounded-t-2xl' : rounded === 'top-lg' ? 'rounded-t-3xl' : ''

  return (
    <div className={`relative w-full overflow-hidden bg-gray-100 ${roundedClass} ${className}`}>
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400 ${roundedClass}`}
          aria-hidden
        >
          <span className="text-5xl leading-none">{PLACEHOLDER_EMOJI[product.category] ?? '🍖'}</span>
          <span className="text-xs font-semibold uppercase tracking-wide">No photo</span>
        </div>
      )}
    </div>
  )
}
