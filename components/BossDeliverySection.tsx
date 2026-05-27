'use client'

import type { DeliveryArea } from '@/types'
import {
  isSavedSlotComplete,
  type CustomerSavedAddresses,
  type SavedAddressSlot,
} from '@/lib/customer-saved-addresses'

type Props = {
  areas: DeliveryArea[]
  customerId: string
  savedAddresses: CustomerSavedAddresses
  onSavedAddressesChange: (addresses: CustomerSavedAddresses) => void
  selectedAddressSlot: 1 | 2
  onSelectedAddressSlotChange: (slot: 1 | 2) => void
  deliverToDifferentAddress: boolean
  onDeliverToDifferentAddressChange: (value: boolean) => void
  recipientName: string
  onRecipientNameChange: (value: string) => void
  recipientPhone: string
  onRecipientPhoneChange: (value: string) => void
  alternateDeliveryAreaId: string
  onAlternateDeliveryAreaIdChange: (id: string) => void
  alternateDeliveryAddress: string
  onAlternateDeliveryAddressChange: (value: string) => void
  onAreaFeeChange: (fee: number) => void
  onSaveAddresses: () => void
  savingAddresses: boolean
  addressMessage: string
}

function updateSlot(
  addresses: CustomerSavedAddresses,
  slot: 1 | 2,
  patch: Partial<SavedAddressSlot>,
): CustomerSavedAddresses {
  const key = slot === 1 ? 'address1' : 'address2'
  return {
    ...addresses,
    [key]: { ...addresses[key], ...patch },
  }
}

function SavedAddressCard({
  slot,
  slotNumber,
  selected,
  disabled,
  areas,
  value,
  onChange,
  onSelect,
  onSave,
  saving,
  canSave,
}: {
  slot: SavedAddressSlot
  slotNumber: 1 | 2
  selected: boolean
  disabled: boolean
  areas: DeliveryArea[]
  value: SavedAddressSlot
  onChange: (patch: Partial<SavedAddressSlot>) => void
  onSelect: () => void
  onSave: () => void
  saving: boolean
  canSave: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${selected && !disabled ? 'border-orange-400 bg-orange-50/60' : 'border-gray-200 bg-gray-50'}`}
    >
      <label className="mb-3 flex cursor-pointer items-center gap-3">
        <input
          type="radio"
          name="boss-saved-address"
          checked={selected && !disabled}
          disabled={disabled}
          onChange={onSelect}
          className="h-5 w-5"
        />
        <span className="text-base font-black">Use address {slotNumber} for this order</span>
      </label>
      <input
        value={value.label}
        onChange={e => onChange({ label: e.target.value })}
        placeholder={`Address ${slotNumber} label`}
        className="mb-2 h-11 w-full rounded-xl border bg-white px-3 text-base"
      />
      <select
        value={value.deliveryAreaId}
        onChange={e => onChange({ deliveryAreaId: e.target.value })}
        className="mb-2 h-11 w-full rounded-xl border bg-white px-3 text-base"
      >
        <option value="">Delivery area</option>
        {areas.map(area => (
          <option key={area.id} value={area.id}>
            {area.name} (${area.delivery_fee})
          </option>
        ))}
      </select>
      <input
        value={value.address}
        onChange={e => onChange({ address: e.target.value })}
        placeholder="Street address"
        className="mb-3 h-11 w-full rounded-xl border bg-white px-3 text-base"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || saving}
        className="min-h-11 w-full rounded-xl bg-white px-4 text-sm font-bold text-gray-800 shadow-sm disabled:opacity-40"
      >
        {saving ? 'Saving...' : `Save address ${slotNumber}`}
      </button>
    </div>
  )
}

export default function BossDeliverySection({
  areas,
  customerId,
  savedAddresses,
  onSavedAddressesChange,
  selectedAddressSlot,
  onSelectedAddressSlotChange,
  deliverToDifferentAddress,
  onDeliverToDifferentAddressChange,
  recipientName,
  onRecipientNameChange,
  recipientPhone,
  onRecipientPhoneChange,
  alternateDeliveryAreaId,
  onAlternateDeliveryAreaIdChange,
  alternateDeliveryAddress,
  onAlternateDeliveryAddressChange,
  onAreaFeeChange,
  onSaveAddresses,
  savingAddresses,
  addressMessage,
}: Props) {
  function handleAlternateAreaChange(areaId: string) {
    onAlternateDeliveryAreaIdChange(areaId)
    const area = areas.find(item => item.id === areaId)
    if (area) onAreaFeeChange(area.delivery_fee)
  }

  function handleSlotAreaChange(slot: 1 | 2, areaId: string) {
    onSavedAddressesChange(updateSlot(savedAddresses, slot, { deliveryAreaId: areaId }))
    if (slot === selectedAddressSlot && !deliverToDifferentAddress) {
      const area = areas.find(item => item.id === areaId)
      if (area) onAreaFeeChange(area.delivery_fee)
    }
  }

  return (
    <div className="mt-3 space-y-4">
      <SavedAddressCard
        slotNumber={1}
        slot={savedAddresses.address1}
        value={savedAddresses.address1}
        selected={selectedAddressSlot === 1}
        disabled={deliverToDifferentAddress}
        areas={areas}
        onChange={patch => {
          onSavedAddressesChange(updateSlot(savedAddresses, 1, patch))
          if (patch.deliveryAreaId !== undefined) {
            handleSlotAreaChange(1, patch.deliveryAreaId)
          }
        }}
        onSelect={() => {
          onSelectedAddressSlotChange(1)
          const area = areas.find(item => item.id === savedAddresses.address1.deliveryAreaId)
          if (area) onAreaFeeChange(area.delivery_fee)
        }}
        onSave={onSaveAddresses}
        saving={savingAddresses}
        canSave={Boolean(customerId) && isSavedSlotComplete(savedAddresses.address1)}
      />
      <SavedAddressCard
        slotNumber={2}
        slot={savedAddresses.address2}
        value={savedAddresses.address2}
        selected={selectedAddressSlot === 2}
        disabled={deliverToDifferentAddress}
        areas={areas}
        onChange={patch => {
          onSavedAddressesChange(updateSlot(savedAddresses, 2, patch))
          if (patch.deliveryAreaId !== undefined) {
            handleSlotAreaChange(2, patch.deliveryAreaId)
          }
        }}
        onSelect={() => {
          onSelectedAddressSlotChange(2)
          const area = areas.find(item => item.id === savedAddresses.address2.deliveryAreaId)
          if (area) onAreaFeeChange(area.delivery_fee)
        }}
        onSave={onSaveAddresses}
        saving={savingAddresses}
        canSave={Boolean(customerId) && isSavedSlotComplete(savedAddresses.address2)}
      />

      {!customerId && (
        <p className="text-sm font-semibold text-gray-500">
          Select an existing customer to save addresses to their profile.
        </p>
      )}
      {addressMessage && (
        <p className="text-center text-sm font-bold text-gray-700">{addressMessage}</p>
      )}

      <button
        type="button"
        onClick={() => onDeliverToDifferentAddressChange(!deliverToDifferentAddress)}
        className={`min-h-12 w-full rounded-2xl border-2 px-4 text-base font-bold ${
          deliverToDifferentAddress
            ? 'border-orange-400 bg-orange-50 text-gray-900'
            : 'border-dashed border-gray-300 text-gray-700'
        }`}
      >
        {deliverToDifferentAddress
          ? 'Using a different delivery address'
          : 'Deliver to a different address'}
      </button>

      {deliverToDifferentAddress && (
        <div className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
          <p className="text-sm font-semibold text-gray-600">
            One-time recipient for this order only
          </p>
          <input
            value={recipientName}
            onChange={e => onRecipientNameChange(e.target.value)}
            placeholder="Recipient name"
            className="h-12 w-full rounded-2xl border bg-white px-4 text-base"
          />
          <input
            value={recipientPhone}
            onChange={e => onRecipientPhoneChange(e.target.value)}
            placeholder="Recipient phone"
            className="h-12 w-full rounded-2xl border bg-white px-4 text-base"
          />
          <select
            value={alternateDeliveryAreaId}
            onChange={e => handleAlternateAreaChange(e.target.value)}
            className="h-12 w-full rounded-2xl border bg-white px-4 text-base"
          >
            <option value="">Delivery area</option>
            {areas.map(area => (
              <option key={area.id} value={area.id}>
                {area.name} (${area.delivery_fee})
              </option>
            ))}
          </select>
          <input
            value={alternateDeliveryAddress}
            onChange={e => onAlternateDeliveryAddressChange(e.target.value)}
            placeholder="Delivery address"
            className="h-12 w-full rounded-2xl border bg-white px-4 text-base"
          />
        </div>
      )}
    </div>
  )
}
