import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImportContactRow } from '@/lib/import-contacts'
import { isValidImportRow, placeholderEmail } from '@/lib/import-contacts'
import { phonesMatch } from '@/lib/phone'

type CustomerRow = {
  id: string
  full_name: string
  email: string
  phone: string | null
}

export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  input: { full_name: string; phone: string; email: string; customerId?: string },
): Promise<CustomerRow> {
  const full_name = input.full_name.trim()
  const phone = input.phone.trim()
  const email = input.email.trim().toLowerCase()

  if (input.customerId) {
    const { data: row, error } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('id', input.customerId)
      .single()

    if (error || !row) {
      throw new Error(error?.message ?? 'Customer not found')
    }

    const { data: updated, error: updateError } = await supabase
      .from('customers')
      .update({ full_name, phone, email })
      .eq('id', row.id)
      .select('id, full_name, email, phone')
      .single()

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Could not update customer')
    }

    return updated
  }

  const { data: rows, error: listError } = await supabase
    .from('customers')
    .select('id, full_name, email, phone')

  if (listError) {
    throw new Error(listError.message)
  }

  const existing = (rows ?? []).find(row => phonesMatch(row.phone, phone))
  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('customers')
      .update({ full_name, phone, email })
      .eq('id', existing.id)
      .select('id, full_name, email, phone')
      .single()

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Could not update customer')
    }

    return updated
  }

  const { data: created, error: createError } = await supabase
    .from('customers')
    .insert({ full_name, phone, email })
    .select('id, full_name, email, phone')
    .single()

  if (createError || !created) {
    throw new Error(createError?.message ?? 'Could not create customer')
  }

  return created
}

export type CustomerImportResult = {
  imported: number
  updated: number
  skipped: number
  errors: string[]
}

export async function importCustomers(
  supabase: SupabaseClient,
  incoming: ImportContactRow[],
): Promise<CustomerImportResult> {
  const result: CustomerImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] }

  const { data: existingRows, error: listError } = await supabase
    .from('customers')
    .select('id, full_name, email, phone')

  if (listError) {
    throw new Error(listError.message)
  }

  const known = [...(existingRows ?? [])]

  for (const row of incoming) {
    const full_name = row.full_name.trim()
    const phone = row.phone.trim()
    const email = (row.email?.trim() || placeholderEmail(phone)).toLowerCase()

    if (!isValidImportRow({ full_name, phone, email })) {
      result.skipped += 1
      continue
    }

    try {
      const match = known.find(customer => phonesMatch(customer.phone, phone))
      if (match) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({ full_name, phone, email })
          .eq('id', match.id)

        if (updateError) throw new Error(updateError.message)

        match.full_name = full_name
        match.phone = phone
        match.email = email
        result.updated += 1
      } else {
        const { data: created, error: createError } = await supabase
          .from('customers')
          .insert({ full_name, phone, email })
          .select('id, full_name, email, phone')
          .single()

        if (createError || !created) {
          throw new Error(createError?.message ?? 'Could not create customer')
        }

        known.push(created)
        result.imported += 1
      }
    } catch (e: unknown) {
      result.errors.push(
        e instanceof Error ? `${full_name}: ${e.message}` : `${full_name}: Import failed`,
      )
    }
  }

  return result
}
