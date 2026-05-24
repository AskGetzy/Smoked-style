import {
  isTerminalCancelled,
  publicStatusLabel,
  trackingStepIndex,
  trackingStepLabels,
} from '@/lib/order-tracking'

type Props = {
  status: string
  orderType: string
}

export default function OrderStatusBar({ status, orderType }: Props) {
  const labels = trackingStepLabels(orderType)
  const activeIndex = trackingStepIndex(status, orderType)
  const cancelled = isTerminalCancelled(status)

  if (cancelled) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-800">
        This order was cancelled.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 text-center">
        <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-800">
          {publicStatusLabel(status, orderType)}
        </span>
      </div>
      <div className="flex items-start">
        {labels.map((label, index) => {
          const done = activeIndex > index
          const active = activeIndex === index
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex w-full flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    done || active ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </div>
                <span
                  className={`mt-1 text-center text-[10px] leading-tight sm:text-xs ${
                    active ? 'font-bold text-orange-600' : done ? 'font-semibold text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < labels.length - 1 && (
                <div className={`mb-5 h-0.5 flex-1 ${done ? 'bg-orange-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
