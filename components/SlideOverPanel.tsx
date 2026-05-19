'use client'

import { useEffect } from 'react'

type SlideOverPanelProps = {
  open: boolean
  title: string
  loading?: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function SlideOverPanel({ open, title, loading = false, onClose, children }: SlideOverPanelProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex md:justify-end">
        <div className="flex h-full w-full flex-col bg-white shadow-2xl md:max-w-md">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <h2 className="pr-4 text-lg font-black" style={{ color: 'var(--navy)' }}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-black text-gray-600"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
