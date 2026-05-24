import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { importCustomers } from '@/lib/customers-server'
import type { ImportContactRow } from '@/lib/import-contacts'

const MAX_IMPORT = 500

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  try {
    const { contacts } = await req.json()
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts to import' }, { status: 400 })
    }

    if (contacts.length > MAX_IMPORT) {
      return NextResponse.json(
        { error: `Import at most ${MAX_IMPORT} contacts at a time` },
        { status: 400 },
      )
    }

    const rows = contacts as ImportContactRow[]
    const result = await importCustomers(admin.supabase, rows)

    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not import customers'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
