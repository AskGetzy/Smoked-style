import type { SupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

export type CustomerPaymentProfile = {
  id: string
  full_name: string
  email: string
  phone: string | null
  stripe_customer_id: string | null
  has_card_on_file: boolean
}

export async function getCustomerPaymentProfile(
  supabase: SupabaseClient,
  customerId: string,
): Promise<CustomerPaymentProfile | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, email, phone, stripe_customer_id')
    .eq('id', customerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    ...data,
    has_card_on_file: await customerHasCardOnFile(data.stripe_customer_id),
  }
}

export async function customerHasCardOnFile(stripeCustomerId: string | null | undefined) {
  if (!stripeCustomerId) return false
  try {
    const methods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
      limit: 1,
    })
    return methods.data.length > 0
  } catch (error) {
    console.error('[bulk-order] Could not load saved cards', { stripeCustomerId, error })
    return false
  }
}

export async function firstCardOnFile(stripeCustomerId: string) {
  const methods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
    limit: 1,
  })
  return methods.data[0] ?? null
}
