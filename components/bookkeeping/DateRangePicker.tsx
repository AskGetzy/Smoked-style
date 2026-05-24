'use client'

import type { BookkeepingDateRange, DateRangePreset } from '@/lib/bookkeeping'

type Props = {
  range: BookkeepingDateRange
  onChange: (preset: DateRangePreset, start?: string, end?: string) => void
}

export default function DateRangePicker({ range, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex gap-2">
        {(['week', 'month', 'custom'] as DateRangePreset[]).map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset, range.start, range.end)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              range.preset === preset
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
            style={range.preset === preset ? { background: 'var(--navy)' } : undefined}
          >
            {preset === 'week' ? 'This week' : preset === 'month' ? 'This month' : 'Custom'}
          </button>
        ))}
      </div>
      {range.preset === 'custom' && (
        <>
          <input
            type="date"
            value={range.start}
            onChange={e => onChange('custom', e.target.value, range.end)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={range.end}
            onChange={e => onChange('custom', range.start, e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </>
      )}
      <span className="text-sm text-gray-500">
        {range.start} — {range.end}
      </span>
    </div>
  )
}
