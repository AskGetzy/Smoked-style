'use client'

import { useState } from 'react'
import { useOrderNotifications } from '@/hooks/useOrderNotifications'

type Props = {
  mode: 'admin' | 'boss'
}

export default function OrderNotificationWatcher({ mode }: Props) {
  const [toast, setToast] = useState<{ message: string; urgent: boolean } | null>(null)
  useOrderNotifications({
    mode,
    onInPageAlert: (message, urgent) => {
      setToast({ message, urgent })
      window.setTimeout(() => setToast(null), urgent ? 8000 : 5000)
    },
  })

  return (
    <>
      {toast && (
        <div
          className={`fixed left-1/2 top-4 z-[110] flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-start justify-between gap-4 rounded-2xl px-5 py-4 shadow-2xl ${
            toast.urgent
              ? 'bg-orange-600 text-white'
              : 'border border-orange-200 bg-orange-50 text-orange-800'
          }`}
        >
          <div className={toast.urgent ? 'text-lg font-black sm:text-xl' : 'text-sm font-semibold'}>
            {toast.message}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
              toast.urgent
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
            }`}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  )
}
