'use client'

import { useRef, useState } from 'react'
import type { Customer } from '@/types'
import { fetchWithAuth } from '@/lib/auth-fetch'
import {
  canPickPhoneContacts,
  parseContactsFile,
  pickPhoneContacts,
  type ImportContactRow,
} from '@/lib/import-contacts'

type ImportResult = {
  imported: number
  updated: number
  skipped: number
  errors: string[]
}

type Props = {
  variant?: 'admin' | 'boss'
  onComplete: () => void
  onCustomersMerged?: (customers: Customer[]) => void
}

export default function CustomerImportPanel({
  variant = 'admin',
  onComplete,
  onCustomersMerged,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const phonePickerAvailable = canPickPhoneContacts()

  const isBoss = variant === 'boss'
  const buttonClass = isBoss
    ? 'min-h-12 w-full rounded-2xl border-2 border-gray-200 bg-white px-4 text-base font-black text-gray-800 disabled:opacity-60'
    : 'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60'

  async function submitImport(contacts: ImportContactRow[]) {
    if (contacts.length === 0) {
      setError('No valid contacts found (name and phone required).')
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)

    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    }

    const res = isBoss
      ? await fetchWithAuth('/api/admin/customers/import', init)
      : await fetch('/api/admin/customers/import', { ...init, credentials: 'include' })

    const data = await res.json().catch(() => ({}))
    setBusy(false)

    if (!res.ok) {
      setError(data.error ?? 'Import failed')
      return
    }

    const result = data as ImportResult
    setMessage(
      `Imported ${result.imported} new, updated ${result.updated}, skipped ${result.skipped}.` +
        (result.errors.length > 0 ? ` ${result.errors.length} errors.` : ''),
    )

    onComplete()
    if (onCustomersMerged) {
      void refreshCustomersForBoss(onCustomersMerged)
    }
  }

  async function refreshCustomersForBoss(merge: (customers: Customer[]) => void) {
    const res = await fetchWithAuth('/api/boss/catalog')
    const data = await res.json()
    if (res.ok) merge(data.customers ?? [])
  }

  async function handlePickFromPhone() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const contacts = await pickPhoneContacts()
      await submitImport(contacts)
    } catch (e: unknown) {
      setBusy(false)
      const msg = e instanceof Error ? e.message : 'Could not read contacts'
      if (!msg.toLowerCase().includes('cancel')) {
        setError(msg)
      }
    }
  }

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    setMessage(null)
    const text = await file.text()
    const contacts = parseContactsFile(file.name, text)
    await submitImport(contacts)
  }

  return (
    <div className={`space-y-2 ${isBoss ? '' : 'mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4'}`}>
      {!isBoss && <p className="text-sm font-semibold text-gray-700">Import from phone</p>}

      {phonePickerAvailable ? (
        <button type="button" disabled={busy} onClick={() => void handlePickFromPhone()} className={buttonClass}>
          {busy ? 'Importing…' : 'Pick contacts from phone'}
        </button>
      ) : (
        <p className={`text-gray-500 ${isBoss ? 'text-sm' : 'text-xs'}`}>
          On Android, use Chrome and tap &quot;Pick contacts&quot;, or export contacts as .vcf / .csv and upload below.
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className={buttonClass}
      >
        {busy ? 'Importing…' : 'Upload contacts file (.vcf or .csv)'}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".vcf,.csv,text/vcard,text/csv"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />

      {!isBoss && (
        <p className="text-xs text-gray-500">
          CSV columns: name, phone, email (header row optional). From Android: Contacts → menu → Export → .vcf file.
        </p>
      )}

      {message && (
        <p className={`font-semibold text-green-700 ${isBoss ? 'text-sm' : 'text-sm'}`}>{message}</p>
      )}
      {error && (
        <p className={`font-semibold text-red-600 ${isBoss ? 'text-sm' : 'text-sm'}`}>{error}</p>
      )}
    </div>
  )
}
