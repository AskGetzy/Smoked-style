import type { Customer } from '@/types'

export type SavedAddressSlot = {
  label: string
  deliveryAreaId: string
  address: string
}

export type CustomerSavedAddresses = {
  address1: SavedAddressSlot
  address2: SavedAddressSlot
}

export const EMPTY_SAVED_ADDRESS: SavedAddressSlot = {
  label: '',
  deliveryAreaId: '',
  address: '',
}

export function defaultSavedAddresses(): CustomerSavedAddresses {
  return {
    address1: { ...EMPTY_SAVED_ADDRESS, label: 'Address 1' },
    address2: { ...EMPTY_SAVED_ADDRESS, label: 'Address 2' },
  }
}

export function savedAddressesFromCustomer(customer: Customer): CustomerSavedAddresses {
  return {
    address1: {
      label: customer.saved_address_1_label?.trim() || 'Address 1',
      deliveryAreaId: customer.saved_delivery_area_id_1 ?? '',
      address: customer.saved_address_1?.trim() ?? '',
    },
    address2: {
      label: customer.saved_address_2_label?.trim() || 'Address 2',
      deliveryAreaId: customer.saved_delivery_area_id_2 ?? '',
      address: customer.saved_address_2?.trim() ?? '',
    },
  }
}

export function customerPatchFromSavedAddresses(
  addresses: CustomerSavedAddresses,
): Record<string, string | null> {
  return {
    saved_address_1_label: addresses.address1.label.trim() || 'Address 1',
    saved_address_1: addresses.address1.address.trim() || null,
    saved_delivery_area_id_1: addresses.address1.deliveryAreaId || null,
    saved_address_2_label: addresses.address2.label.trim() || 'Address 2',
    saved_address_2: addresses.address2.address.trim() || null,
    saved_delivery_area_id_2: addresses.address2.deliveryAreaId || null,
  }
}

export function isSavedSlotComplete(slot: SavedAddressSlot): boolean {
  return Boolean(slot.deliveryAreaId && slot.address.trim())
}

export function pickSlot(
  addresses: CustomerSavedAddresses,
  slot: 1 | 2,
): SavedAddressSlot {
  return slot === 1 ? addresses.address1 : addresses.address2
}
