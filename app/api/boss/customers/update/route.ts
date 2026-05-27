import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  customerPatchFromSavedAddresses,
  defaultSavedAddresses,
  isSavedSlotComplete,
  type CustomerSavedAddresses,
  type SavedAddressSlot,
} from '@/lib/customer-saved-addresses'

type UpdateBody = {
  customerId?: string
  savedAddresses?: CustomerSavedAddresses
}

function normalizeSlot(
  slot: SavedAddressSlot | undefined,
  fallbackLabel: string,
): { slot: SavedAddressSlot; invalid: boolean } {
  const label = String(slot?.label ?? '').trim() || fallbackLabel
  const deliveryAreaId = String(slot?.deliveryAreaId ?? '').trim()
  const address = String(slot?.address ?? '').trim()
  if (!deliveryAreaId && !address) {
    return { slot: { label, deliveryAreaId: '', address: '' }, invalid: false }
  }
  if (!isSavedSlotComplete({ label, deliveryAreaId, address })) {
    return { slot: { label, deliveryAreaId, address }, invalid: true }
  }
  return { slot: { label, deliveryAreaId, address }, invalid: false }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return admin.response

  try {
    const body = (await req.json()) as UpdateBody
    const customerId = String(body.customerId ?? '').trim()
    if (!customerId) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 })
    }

    const defaults = defaultSavedAddresses()
    const slot1 = normalizeSlot(body.savedAddresses?.address1, defaults.address1.label)
    const slot2 = normalizeSlot(body.savedAddresses?.address2, defaults.address2.label)

    if (slot1.invalid) {
      return NextResponse.json(
        { error: 'Address 1 requires a delivery area and street address when saving' },
        { status: 400 },
      )
    }
    if (slot2.invalid) {
      return NextResponse.json(
        { error: 'Address 2 requires a delivery area and street address when saving' },
        { status: 400 },
      )
    }

    const patch = customerPatchFromSavedAddresses({
      address1: slot1.slot,
      address2: slot2.slot,
    })
    const { supabase } = admin
    const { data: customer, error } = await supabase
      .from('customers')
      .update(patch)
      .eq('id', customerId)
      .select(
        'id, full_name, email, phone, saved_address_1, saved_delivery_area_id_1, saved_address_1_label, saved_address_2, saved_delivery_area_id_2, saved_address_2_label',
      )
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: error?.message ?? 'Could not update customer' }, { status: 500 })
    }

    return NextResponse.json({ customer })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not update customer'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
