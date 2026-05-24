import { formatDeliveryDate } from '@/lib/dates'
import { displayBuyerName, displayBuyerPhone } from '@/lib/order-buyer'
import {
  ORDER_TRACKING_CONTACT_EMAIL,
  ORDER_TRACKING_CONTACT_PHONE,
} from '@/lib/order-tracking'
import type { Order } from '@/types'

type SlipItem = {
  product_name: string
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function itemDetails(item: SlipItem) {
  return [
    item.selected_flavor,
    item.selected_weight != null ? `${item.selected_weight} lb` : null,
    item.selected_size,
  ]
    .filter(Boolean)
    .join(' · ')
}

function renderItems(items: SlipItem[]) {
  if (items.length === 0) {
    return '<p class="muted">No items listed.</p>'
  }

  return `<ul class="items">${items
    .map(item => {
      const details = itemDetails(item)
      return `<li><strong>${escapeHtml(item.product_name)}</strong> × ${escapeHtml(item.quantity)}${
        details ? `<span class="muted"> — ${escapeHtml(details)}</span>` : ''
      }</li>`
    })
    .join('')}</ul>`
}

export function buildPackingSlipHtml(order: Order) {
  const isPickup = order.order_type === 'pickup'
  const areaName = order.delivery_areas?.name ?? null
  const items = (order.order_items ?? []) as SlipItem[]

  return `
    <section class="slip">
      <header>
        <div class="brand">SMOKED <span>STYLE</span></div>
        <div class="contact">${ORDER_TRACKING_CONTACT_PHONE} · ${ORDER_TRACKING_CONTACT_EMAIL}</div>
      </header>
      <h1>Order ${escapeHtml(order.order_number)}</h1>
      <p class="customer"><strong>${escapeHtml(displayBuyerName(order))}</strong></p>
      ${displayBuyerPhone(order) ? `<p class="muted">${escapeHtml(displayBuyerPhone(order))}</p>` : ''}
      <div class="meta">
        <p><strong>${isPickup ? 'Pickup' : 'Delivery'}</strong></p>
        ${!isPickup && order.delivery_address ? `<p>${escapeHtml(order.delivery_address)}</p>` : ''}
        ${areaName ? `<p>Area: ${escapeHtml(areaName)}</p>` : ''}
        <p>Date: ${escapeHtml(formatDeliveryDate(order.delivery_date) || 'TBD')}</p>
      </div>
      <h2>Items</h2>
      ${renderItems(items)}
      ${
        order.gift_message
          ? `<div class="gift"><strong>Gift message</strong><p>${escapeHtml(order.gift_message)}</p></div>`
          : ''
      }
      ${
        order.order_notes
          ? `<div class="notes"><strong>Notes</strong><p>${escapeHtml(order.order_notes)}</p></div>`
          : ''
      }
      <p class="thanks">Thank you for your order! We hope you enjoy every bite.</p>
    </section>
  `
}

const PACKING_SLIP_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; }
  .slip { max-width: 720px; margin: 0 auto; padding: 24px 0; }
  .slip + .page-break { page-break-after: always; break-after: page; height: 0; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 28px; font-weight: 900; letter-spacing: 0.04em; color: #0f172a; }
  .brand span { color: #f97316; }
  .contact { margin-top: 6px; font-size: 13px; color: #6b7280; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  h2 { margin: 20px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #f97316; }
  .customer { margin: 0; font-size: 18px; }
  .muted { color: #6b7280; font-size: 14px; }
  .meta { margin: 16px 0; padding: 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; }
  .meta p { margin: 0 0 6px; }
  .items { margin: 0; padding-left: 20px; line-height: 1.6; }
  .gift, .notes { margin-top: 16px; padding: 12px; border-radius: 12px; background: #f9fafb; }
  .gift p, .notes p { margin: 6px 0 0; }
  .thanks { margin-top: 24px; font-weight: 700; color: #0f172a; }
  @media print {
    body { padding: 0; }
    .slip { padding: 12px 0; }
  }
`

export function buildBulkPackingSlipsHtml(orders: Order[]) {
  const body = orders
    .map((order, index) => {
      const slip = buildPackingSlipHtml(order)
      if (index === orders.length - 1) return slip
      return `${slip}<div class="page-break"></div>`
    })
    .join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Packing Slips</title>
    <style>${PACKING_SLIP_STYLES}</style>
  </head>
  <body>${body}</body>
</html>`
}

export function openBulkPackingSlips(orders: Order[]) {
  const html = buildBulkPackingSlipsHtml(orders)
  const tab = window.open('', '_blank')
  if (!tab) {
    throw new Error('Pop-up blocked. Allow pop-ups to print packing slips.')
  }
  tab.document.open()
  tab.document.write(html)
  tab.document.close()
  tab.focus()
  tab.onload = () => {
    tab.print()
  }
}
