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
      <div
        className="rounded-2xl px-4 py-3 text-center text-sm font-semibold"
        style={{
          border: '1px solid #fecaca',
          background: '#fef2f2',
          color: '#991b1b',
        }}
      >
        This order was cancelled.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <span
          className="text-xs font-bold uppercase tracking-[0.06em]"
          style={{ color: 'var(--rustic-green-soft)' }}
        >
          {publicStatusLabel(status, orderType)}
        </span>
        {activeIndex >= 0 && activeIndex < labels.length - 1 && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: 'var(--rustic-ember)', color: 'var(--rustic-navy)' }}
          >
            In progress
          </span>
        )}
        {activeIndex === labels.length - 1 && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ background: 'var(--rustic-navy)' }}
          >
            Complete
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {labels.map((label, index) => {
          const done = activeIndex > index
          const active = activeIndex === index
          const pending = activeIndex < index
          const isLast = index === labels.length - 1

          return (
            <div key={label} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <div
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{
                    background: pending
                      ? 'var(--rustic-surface)'
                      : active
                        ? 'var(--rustic-ember)'
                        : 'var(--rustic-navy)',
                    border: pending ? '2px solid var(--rustic-rule)' : 'none',
                  }}
                />
                {!isLast && (
                  <div
                    className="my-0.5 w-0.5 flex-1"
                    style={{
                      minHeight: 28,
                      background: pending || active ? 'var(--rustic-rule)' : 'var(--rustic-navy)',
                    }}
                  />
                )}
              </div>
              <div className={isLast ? 'pb-0' : 'pb-5'}>
                <div
                  className="text-sm"
                  style={{
                    fontWeight: pending ? 500 : 700,
                    color: pending ? 'var(--rustic-muted)' : 'var(--rustic-smoke)',
                  }}
                >
                  {label}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--rustic-muted)' }}>
                  {done ? 'Completed' : active ? 'Current step' : 'Upcoming'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress ticks matching the mock home card */}
      <div className="mt-4 flex gap-1.5">
        {labels.map((_, index) => (
          <div
            key={index}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                activeIndex > index
                  ? 'var(--rustic-navy)'
                  : activeIndex === index
                    ? 'var(--rustic-ember)'
                    : 'rgba(30, 64, 53, 0.15)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
