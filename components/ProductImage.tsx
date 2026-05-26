import type { Product } from '@/types'

const CATEGORY_WORDMARK: Record<string, string> = {
  jerky: 'Jerky',
  boards: 'Boards',
  steaks: 'Steaks',
  smoked: 'Smoked',
  non_smoked: 'Fresh Cuts',
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
    <div className={`relative w-full overflow-hidden bg-stone-100 ${roundedClass} ${className}`}>
      {product.image_url ? (
        <>
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(20,15,10,0.02),rgba(20,15,10,0.18))]" />
        </>
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#eadfc9,#d9c3a0_58%,#b99867)] px-6 text-center text-stone-700 ${roundedClass}`}
          aria-hidden
        >
          <div className="rounded-full border border-white/45 bg-white/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-stone-800">
            Smoked Style
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900">
            {CATEGORY_WORDMARK[product.category] ?? 'Smokehouse'}
          </div>
          <div className="h-px w-16 bg-stone-700/25" />
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-700/75">
            No photo yet
          </span>
        </div>
      )}
    </div>
  )
}
