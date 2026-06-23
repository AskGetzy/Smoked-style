import type { Product } from '@/types'

const PLACEHOLDER_ICON: Record<string, string> = {
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
  outOfStock?: boolean
}

export default function ProductImage({
  product,
  className = 'h-[230px]',
  rounded = 'top',
  outOfStock = false,
}: Props) {
  const roundedClass =
    rounded === 'top'
      ? 'rounded-t-[18px]'
      : rounded === 'top-lg'
        ? 'rounded-2xl'
        : ''

  const imageFilter = outOfStock
    ? 'grayscale-[0.85] brightness-[0.85]'
    : 'saturate-[1.05] contrast-[1.02]'

  return (
    <div
      className={`relative w-full overflow-hidden ${roundedClass} ${className}`}
      style={{ background: '#ECE4D8' }}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${imageFilter}`}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-2 ${roundedClass}`}
          style={{ background: 'var(--rustic-bg)' }}
          aria-hidden
        >
          <span className="text-4xl leading-none opacity-70" style={{ color: 'var(--rustic-muted)' }}>
            {PLACEHOLDER_ICON[product.category] ?? '🍖'}
          </span>
        </div>
      )}
    </div>
  )
}
