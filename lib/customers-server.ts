import type { SupabaseClient } from '@supabase/supabase-js'
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
