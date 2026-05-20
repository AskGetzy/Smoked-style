'use client'

type SignOutButtonProps = {
  onClick: () => void
  label?: string
  className?: string
  variant?: 'navy' | 'light'
}

export default function SignOutButton({
  onClick,
  label = 'Sign Out',
  className = '',
  variant = 'navy',
}: SignOutButtonProps) {
  const base =
    variant === 'navy'
      ? 'rounded-xl border border-white/25 bg-white/15 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/25'
      : 'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 shadow-sm transition-colors hover:bg-gray-50'

  return (
    <button type="button" onClick={onClick} className={`${base} ${className}`.trim()}>
      {label}
    </button>
  )
}
