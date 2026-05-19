import { Resend } from 'resend'
import { formatDeliveryDate } from '@/lib/dates'

type EmailCustomer = {
  full_name?: string | null
  email?: string | null
  phone?: string | null
}

type EmailOrderItem = {
  product_name: string
  quantity: number
  selected_flavor?: string | null
  selected_weight?: number | null
  selected_size?: string | null
  unit_price?: number | null
  line_total?: number | null
}

export type EmailOrder = {
  order_number: string
  order_type?: 'delivery' | 'pickup' | string | null
  delivery_address?: string | null
  delivery_date?: string | null
  recipient_name?: string | null
  recipient_phone?: string | null
  subtotal?: number | null
  delivery_fee?: number | null
  total: number
  customers?: EmailCustomer | null
  order_items?: EmailOrderItem[] | null
}

const CONTACT_PHONE = '(718) 810-9472'
const CONTACT_EMAIL = 'Smokedstyle1@gmail.com'
const RESEND_TEST_FROM = 'Smoked Style <onboarding@resend.dev>'

let resend: Resend | null = null

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  console.log('[email] Checking RESEND_API_KEY', { hasApiKey: Boolean(apiKey) })
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Skipping transactional email.')
    return null
  }

  if (!resend) {
    console.log('[email] Initializing Resend client')
    resend = new Resend(apiKey)
  }

  return resend
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value ?? 0))
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'To be confirmed'
  return formatDeliveryDate(value) || value
}

function itemDetails(item: EmailOrderItem) {
  return [
    item.selected_flavor,
    item.selected_weight ? `${item.selected_weight} lb` : null,
    item.selected_size,
  ].filter(Boolean).join(' | ')
}

function renderItems(items: EmailOrderItem[] = []) {
  if (items.length === 0) {
    return '<p style="margin:0;color:#6b7280;">No items listed.</p>'
  }

  return items.map((item) => {
    const details = itemDetails(item)
    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:700;color:#111827;">${escapeHtml(item.product_name)}</div>
          ${details ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;">${escapeHtml(details)}</div>` : ''}
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">Qty: ${escapeHtml(item.quantity)}</div>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111827;">
          ${formatCurrency(item.line_total)}
        </td>
      </tr>
    `
  }).join('')
}

function deliveryDetails(order: EmailOrder) {
  const isDelivery = order.order_type === 'delivery'
  return `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:22px 0;">
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#c2410c;font-weight:800;margin-bottom:8px;">
        ${isDelivery ? 'Delivery Details' : 'Pickup Details'}
      </div>
      <p style="margin:0 0 6px;color:#111827;"><strong>Date:</strong> ${escapeHtml(formatDate(order.delivery_date))}</p>
      ${isDelivery ? `<p style="margin:0 0 6px;color:#111827;"><strong>Address:</strong> ${escapeHtml(order.delivery_address || 'Not provided')}</p>` : '<p style="margin:0 0 6px;color:#111827;"><strong>Type:</strong> Pickup</p>'}
      ${order.recipient_name ? `<p style="margin:0 0 6px;color:#111827;"><strong>Recipient:</strong> ${escapeHtml(order.recipient_name)}</p>` : ''}
      ${order.recipient_phone ? `<p style="margin:0;color:#111827;"><strong>Recipient phone:</strong> ${escapeHtml(order.recipient_phone)}</p>` : ''}
    </div>
  `
}

function layout({
  preview,
  heading,
  intro,
  order,
  extra,
}: {
  preview: string
  heading: string
  intro: string
  order: EmailOrder
  extra?: string
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${escapeHtml(preview)}</title>
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;margin:0;padding:0;width:100%;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:22px;overflow:hidden;">
                <tr>
                  <td style="background:#0f172a;padding:28px 24px;text-align:center;">
                    <div style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:.04em;">SMOKED <span style="color:#f97316;">STYLE</span></div>
                    <div style="color:#fed7aa;font-size:13px;margin-top:8px;">Premium smoked meats, prepared with care</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 22px;">
                    <h1 style="margin:0 0 12px;color:#111827;font-size:24px;line-height:1.2;">${escapeHtml(heading)}</h1>
                    <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.55;">${intro}</p>
                    ${extra ?? ''}
                    <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#f97316;font-weight:800;margin:24px 0 8px;">
                      Order #${escapeHtml(order.order_number)}
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      ${renderItems(order.order_items ?? [])}
                    </table>
                    ${deliveryDetails(order)}
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:18px;">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;">Subtotal</td>
                        <td style="padding:6px 0;text-align:right;color:#111827;">${formatCurrency(order.subtotal)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;">Delivery</td>
                        <td style="padding:6px 0;text-align:right;color:#111827;">${formatCurrency(order.delivery_fee)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 0;color:#111827;font-size:18px;font-weight:900;border-top:1px solid #e5e7eb;">Total</td>
                        <td style="padding:12px 0 0;text-align:right;color:#111827;font-size:18px;font-weight:900;border-top:1px solid #e5e7eb;">${formatCurrency(order.total)}</td>
                      </tr>
                    </table>
                    <div style="margin-top:26px;padding:16px;border-radius:14px;background:#f9fafb;color:#374151;font-size:14px;line-height:1.5;">
                      Questions? Call ${CONTACT_PHONE} or email ${CONTACT_EMAIL}.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function orderRecipient(order: EmailOrder) {
  return order.customers?.email || null
}

async function sendEmail(order: EmailOrder, subject: string, html: string) {
  const to = orderRecipient(order)
  if (!to) {
    console.warn(`No customer email found for order ${order.order_number}. Skipping email.`)
    return null
  }

  const client = getResend()
  if (!client) return null

  console.log('[email] Sending email with Resend', {
    orderNumber: order.order_number,
    to,
    from: RESEND_TEST_FROM,
    subject,
  })

  const result = await client.emails.send({
    from: RESEND_TEST_FROM,
    to,
    subject,
    html,
  })

  if (result.error) {
    console.error('[email] Resend returned an error', {
      orderNumber: order.order_number,
      subject,
      message: result.error.message,
    })
    throw new Error(`Resend email failed: ${result.error.message}`)
  }

  console.log('[email] Resend email sent', {
    orderNumber: order.order_number,
    subject,
    id: result.data?.id,
  })

  return result
}

export async function sendOrderConfirmation(order: EmailOrder) {
  const subject = `Order Received — Smoked Style #${order.order_number}`
  return sendEmail(order, subject, layout({
    preview: `Order received: Smoked Style #${order.order_number}`,
    heading: 'We received your order',
    intro: 'Thank you for ordering from Smoked Style. Your order is pending approval. We will review it shortly, and your card will only be charged after the order is approved.',
    order,
  }))
}

export async function sendOrderApproval(order: EmailOrder) {
  const subject = `Your Smoked Style Order #${order.order_number} is Confirmed!`
  return sendEmail(order, subject, layout({
    preview: `Your Smoked Style order #${order.order_number} is confirmed`,
    heading: 'Your order is confirmed',
    intro: `Your order has been approved and your card has been charged ${formatCurrency(order.total)}.`,
    order,
  }))
}

export async function sendOrderUpdate(order: EmailOrder, changes: string[]) {
  const subject = `Updated Smoked Style Order #${order.order_number}`
  return sendEmail(order, subject, layout({
    preview: `Your Smoked Style order #${order.order_number} was updated`,
    heading: 'Your order was updated',
    intro: `We made a change to your pending order before approval. Your updated order total is ${formatCurrency(order.total)}. Your card will only be charged after the order is approved.`,
    order,
    extra: `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:18px 0;color:#9a3412;line-height:1.5;">
        <strong>Changes:</strong>
        <ul style="margin:8px 0 0;padding-left:18px;">
          ${changes.length > 0 ? changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('') : '<li>Order details were updated.</li>'}
        </ul>
      </div>
    `,
  }))
}

export async function sendOrderRejection(order: EmailOrder, reason: string) {
  const subject = `Update on your Smoked Style Order #${order.order_number}`
  return sendEmail(order, subject, layout({
    preview: `Update on Smoked Style order #${order.order_number}`,
    heading: 'An update on your order',
    intro: 'We are sorry, but we were unable to approve this order.',
    order,
    extra: `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:16px;margin:18px 0;color:#991b1b;line-height:1.5;">
        <strong>Reason:</strong> ${escapeHtml(reason || 'No reason provided')}
      </div>
      <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.55;">
        You are welcome to place a new order or call us at ${CONTACT_PHONE} so we can help.
      </p>
    `,
  }))
}

export async function sendOrderDelivered(order: EmailOrder) {
  const subject = `Your Smoked Style Order #${order.order_number} has been Delivered!`
  return sendEmail(order, subject, layout({
    preview: `Your Smoked Style order #${order.order_number} has been delivered`,
    heading: 'Your order has been delivered',
    intro: 'Your order has been delivered! We hope you enjoy every bite.',
    order,
    extra: `
      <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:14px;padding:16px;margin:18px 0;color:#166534;line-height:1.5;">
        <p style="margin:0 0 10px;">If you did not receive your order, or if something is wrong, please contact us immediately:</p>
        <p style="margin:0 0 6px;"><strong>Call or WhatsApp:</strong> ${CONTACT_PHONE}</p>
        <p style="margin:0 0 10px;"><strong>Email:</strong> ${CONTACT_EMAIL}</p>
        <p style="margin:0;">We are here to make it right.</p>
      </div>
    `,
  }))
}

export async function sendOrderReadyForPickup(order: EmailOrder) {
  const subject = `Your Smoked Style Order #${order.order_number} is Ready for Pickup!`
  return sendEmail(order, subject, layout({
    preview: `Your Smoked Style order #${order.order_number} is ready for pickup`,
    heading: 'Your order is ready for pickup',
    intro: 'Your order is ready! Please come pick it up at your earliest convenience.',
    order,
    extra: `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:18px 0;color:#9a3412;line-height:1.5;">
        <p style="margin:0 0 8px;">If you have any questions call or WhatsApp: ${CONTACT_PHONE}</p>
        <p style="margin:0;"><strong>Email:</strong> ${CONTACT_EMAIL}</p>
      </div>
    `,
  }))
}
