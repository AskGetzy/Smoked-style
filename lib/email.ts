import { Resend } from 'resend'
import { formatDeliveryDate } from '@/lib/dates'
import { getOrderTrackingUrl } from '@/lib/order-tracking'

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
  bulk_payment_method?: 'payment_link' | 'cash' | 'check' | 'card_on_file' | null
  bulk_paid_at?: string | null
  customers?: EmailCustomer | null
  order_items?: EmailOrderItem[] | null
}

type BulkBuyerConfirmationInput = {
  orderNumber: string
  buyerName: string
  buyerEmail: string
  total: number
  paymentMethod: 'payment_link' | 'cash' | 'check' | 'card_on_file'
  paymentUrl?: string | null
  paidAt?: string | null
  recipients: Array<{ recipient_name: string; product_name: string }>
}

type BulkRecipientNotificationInput = {
  orderNumber: string
  buyerName: string
  recipientName: string
  recipientEmail: string
  productName: string
  giftMessage?: string | null
  orderType: 'delivery' | 'pickup'
  address?: string | null
  areaName?: string | null
  deliveryDate?: string | null
}

const CONTACT_PHONE = '(718) 810-9472'
const CONTACT_EMAIL = 'Smokedstyle1@gmail.com'
const RESEND_TEST_FROM = 'Smoked Style <onboarding@resend.dev>'

function emailFromAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || RESEND_TEST_FROM
}

function adminNotificationEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || CONTACT_EMAIL
}

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

function rusticEmailLayout({
  preview,
  heading,
  intro,
  body,
}: {
  preview: string
  heading: string
  intro: string
  body: string
}) {
  return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>${escapeHtml(preview)}</title>
    </head>
    <body style="margin:0;padding:0;background:#efe2cf;font-family:Arial,Helvetica,sans-serif;color:#2b2118;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#efe2cf;">
        <tr>
          <td align="center" style="padding:28px 12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#fffaf2;border:1px solid #e0c7a6;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:28px 26px 18px;background:linear-gradient(180deg,#2b2118 0%,#463628 100%);text-align:center;">
                  <div style="color:#f7e7cf;font-size:12px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;">Smoked Style</div>
                  <div style="margin-top:10px;color:#fff7ea;font-size:32px;line-height:1.1;font-family:'Playfair Display',Georgia,serif;font-weight:700;">${escapeHtml(heading)}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:26px;">
                  <p style="margin:0 0 20px;color:#4b3b2d;font-size:16px;line-height:1.7;">${intro}</p>
                  ${body}
                  <div style="margin-top:24px;border-top:1px solid #ead7bc;padding-top:18px;color:#6f5a45;font-size:14px;line-height:1.6;">
                    Questions? Call or WhatsApp <strong>${CONTACT_PHONE}</strong> or email <strong>${CONTACT_EMAIL}</strong>.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`
}

function bulkPaymentStatusLabel(
  paymentMethod: BulkBuyerConfirmationInput['paymentMethod'],
  paidAt?: string | null,
) {
  if (paymentMethod === 'payment_link') return 'Payment link sent'
  if (paymentMethod === 'cash') return paidAt ? 'Paid by cash' : 'Pending cash payment'
  if (paymentMethod === 'check') return paidAt ? 'Paid by check' : 'Pending check payment'
  return paidAt ? 'Paid by card on file' : 'Pending card charge'
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

function renderOrderTrackingButton(orderNumber: string) {
  const trackUrl = getOrderTrackingUrl(orderNumber)
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" style="border-radius:12px;background:#f97316;">
                <a href="${escapeHtml(trackUrl)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
                  Track your order status
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
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

async function sendEmailToAddress(to: string, subject: string, html: string) {
  const client = getResend()
  if (!client) return null

  console.log('[email] Sending email with Resend', { to, subject, from: emailFromAddress() })

  const result = await client.emails.send({
    from: emailFromAddress(),
    to,
    subject,
    html,
  })

  if (result.error) {
    console.error('[email] Resend returned an error', { to, subject, message: result.error.message })
    throw new Error(`Resend email failed: ${result.error.message}`)
  }

  console.log('[email] Resend email sent', { to, subject, id: result.data?.id })
  return result
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

  return sendEmailToAddress(to, subject, html)
}

export async function sendOrderConfirmation(order: EmailOrder) {
  const subject = `Order Received — Smoked Style #${order.order_number}`
  return sendEmail(order, subject, layout({
    preview: `Order received: Smoked Style #${order.order_number}`,
    heading: 'We received your order',
    intro: 'Thank you for ordering from Smoked Style. Your order is pending approval. We will review it shortly, and your card will only be charged after the order is approved.',
    order,
    extra: renderOrderTrackingButton(order.order_number),
  }))
}

export async function sendOrderApproval(order: EmailOrder) {
  const subject = `Your Smoked Style Order #${order.order_number} is Confirmed!`
  const alreadyPaid = Boolean(order.bulk_paid_at)
  return sendEmail(order, subject, layout({
    preview: `Your Smoked Style order #${order.order_number} is confirmed`,
    heading: 'Your order is confirmed',
    intro: alreadyPaid
      ? `Your order has been approved and your payment of ${formatCurrency(order.total)} has already been recorded.`
      : `Your order has been approved! Your card will be charged ${formatCurrency(order.total)} when your order is out for delivery or ready for pickup.`,
    order,
    extra: renderOrderTrackingButton(order.order_number),
  }))
}

export async function sendOrderUpdate(order: EmailOrder, changes: string[]) {
  const subject = `Updated Smoked Style Order #${order.order_number}`
  return sendEmail(order, subject, layout({
    preview: `Your Smoked Style order #${order.order_number} was updated`,
    heading: 'Your order was updated',
    intro: `We made a change to your order. Your updated order total is ${formatCurrency(order.total)}. Your card will be charged when your order is out for delivery or ready for pickup.`,
    order,
    extra: `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:18px 0;color:#9a3412;line-height:1.5;">
        <strong>Changes:</strong>
        <ul style="margin:8px 0 0;padding-left:18px;">
          ${changes.length > 0 ? changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('') : '<li>Order details were updated.</li>'}
        </ul>
      </div>
      ${renderOrderTrackingButton(order.order_number)}
    `,
  }))
}

export async function sendOrderDateChanged(order: EmailOrder, previousDate: string | null) {
  const isPickup = order.order_type === 'pickup'
  const subject = `Your Smoked Style Order #${order.order_number} — ${isPickup ? 'pickup' : 'delivery'} date changed`
  return sendEmail(order, subject, layout({
    preview: `Your Smoked Style order #${order.order_number} ${isPickup ? 'pickup' : 'delivery'} date changed`,
    heading: `Your ${isPickup ? 'pickup' : 'delivery'} date was updated`,
    intro: `We had to reschedule your order. Your new ${isPickup ? 'pickup' : 'delivery'} date is ${escapeHtml(formatDate(order.delivery_date))}.`,
    order,
    extra: `
      ${previousDate ? `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:18px 0;color:#9a3412;line-height:1.5;">
          <strong>Previous date:</strong> ${escapeHtml(formatDate(previousDate))}
        </div>
      ` : ''}
      ${renderOrderTrackingButton(order.order_number)}
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
      ${renderOrderTrackingButton(order.order_number)}
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
      ${renderOrderTrackingButton(order.order_number)}
    `,
  }))
}

export async function sendBulkPaymentLinkEmail(input: {
  order_number: string
  total: number
  customerName: string
  email: string
  paymentUrl: string
}) {
  const subject = `Complete payment for your Smoked Style bulk order #${input.order_number}`
  return sendEmailToAddress(
    input.email,
    subject,
    `<!doctype html>
      <html>
        <body style="margin:0;padding:24px;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:22px;overflow:hidden;">
            <div style="background:#0f172a;padding:28px 24px;text-align:center;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:.04em;">SMOKED <span style="color:#f97316;">STYLE</span></div>
            <div style="padding:28px 24px;">
              <h1 style="margin:0 0 12px;color:#111827;font-size:24px;">Your bulk order is ready for payment</h1>
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.55;">Hi ${escapeHtml(input.customerName)}, please use the secure Stripe checkout link below to pay for bulk order <strong>#${escapeHtml(input.order_number)}</strong>.</p>
              <p style="margin:0 0 18px;color:#111827;font-size:18px;font-weight:800;">Total due: ${formatCurrency(input.total)}</p>
              <p style="margin:0 0 22px;"><a href="${escapeHtml(input.paymentUrl)}" style="display:inline-block;border-radius:12px;background:#f97316;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;">Pay bulk order</a></p>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">If you have any questions, call ${CONTACT_PHONE} or email ${CONTACT_EMAIL}.</p>
            </div>
          </div>
        </body>
      </html>`,
  )
}

export async function sendBulkOrderBuyerConfirmation(input: BulkBuyerConfirmationInput) {
  const statusLabel = bulkPaymentStatusLabel(input.paymentMethod, input.paidAt)
  const recipientItems = input.recipients
    .map(
      recipient => `
        <li style="margin:0 0 10px;color:#3f3125;line-height:1.5;">
          <strong>${escapeHtml(recipient.recipient_name)}</strong>
          <span style="color:#8a5a2b;">— ${escapeHtml(recipient.product_name)}</span>
        </li>`,
    )
    .join('')

  return sendEmailToAddress(
    input.buyerEmail,
    `Your bulk order has been placed — Smoked Style #${input.orderNumber}`,
    rusticEmailLayout({
      preview: `Bulk order ${input.orderNumber} has been placed`,
      heading: 'Your bulk order has been placed',
      intro: `Hi ${escapeHtml(input.buyerName)}, we received your bulk order and are getting everything lined up for your recipients.`,
      body: `
        <div style="margin-bottom:18px;border:1px solid #e2c9a6;border-radius:18px;background:#fff4e2;padding:18px;">
          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">Order number</div>
          <div style="margin-top:8px;font-size:24px;font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#2b2118;">#${escapeHtml(input.orderNumber)}</div>
        </div>
        <div style="margin-bottom:18px;border:1px solid #e8d7bf;border-radius:18px;background:#fffdf8;padding:18px;">
          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">Recipients</div>
          <ul style="margin:14px 0 0;padding-left:20px;">${recipientItems}</ul>
        </div>
        <div style="margin-bottom:18px;border:1px solid #e2c9a6;border-radius:18px;background:#fff4e2;padding:18px;">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
            <div>
              <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">Order total</div>
              <div style="margin-top:8px;font-size:28px;font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#2b2118;">${formatCurrency(input.total)}</div>
            </div>
            <div style="min-width:200px;border:1px solid #efc48b;border-radius:14px;background:#fffaf2;padding:12px 14px;">
              <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">Payment status</div>
              <div style="margin-top:6px;font-size:16px;font-weight:700;color:#2b2118;">${escapeHtml(statusLabel)}</div>
            </div>
          </div>
          ${
            input.paymentMethod === 'payment_link' && input.paymentUrl
              ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(input.paymentUrl)}" style="display:inline-block;border-radius:12px;background:#c65b1a;padding:12px 20px;color:#fffaf2;text-decoration:none;font-weight:700;">Pay for this bulk order</a></p>`
              : ''
          }
        </div>
      `,
    }),
  )
}

export async function sendBulkRecipientNotification(input: BulkRecipientNotificationInput) {
  const isDelivery = input.orderType === 'delivery'
  const deliveryInfo = isDelivery
    ? `
      <div style="margin:18px 0;border:2px solid #d89a54;border-radius:18px;background:#fff7ea;padding:18px;">
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">Delivery info</div>
        <p style="margin:12px 0 6px;"><strong>Address:</strong> ${escapeHtml(input.address || 'Not provided')}</p>
        <p style="margin:0 0 6px;"><strong>Area:</strong> ${escapeHtml(input.areaName || 'Not provided')}</p>
        <p style="margin:0 0 12px;"><strong>Expected delivery date:</strong> ${escapeHtml(formatDate(input.deliveryDate))}</p>
        <p style="margin:0;color:#6d4421;line-height:1.6;">Please double check your delivery address below. If anything is incorrect, contact us right away at ${CONTACT_PHONE} so we can update it before delivery.</p>
      </div>`
    : `
      <div style="margin:18px 0;border:2px solid #d89a54;border-radius:18px;background:#fff7ea;padding:18px;">
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">Pickup info</div>
        <p style="margin:12px 0 6px;"><strong>Pickup location:</strong> Smoked Style</p>
        <p style="margin:0 0 12px;"><strong>Pickup date:</strong> ${escapeHtml(formatDate(input.deliveryDate))}</p>
        <p style="margin:0;color:#6d4421;line-height:1.6;">Please bring ID or contact us at ${CONTACT_PHONE} to confirm the pickup details before arriving.</p>
      </div>`

  return sendEmailToAddress(
    input.recipientEmail,
    `${input.buyerName} is sending you a gift from Smoked Style!`,
    rusticEmailLayout({
      preview: `${input.buyerName} is sending you a gift from Smoked Style`,
      heading: 'A gift is on the way',
      intro: `${escapeHtml(input.buyerName)} is sending you a gift from Smoked Style!`,
      body: `
        <div style="margin-bottom:18px;border:1px solid #e2c9a6;border-radius:18px;background:#fff4e2;padding:18px;">
          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">What’s arriving</div>
          <div style="margin-top:8px;font-size:24px;font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#2b2118;">${escapeHtml(input.productName)}</div>
        </div>
        ${
          input.giftMessage
            ? `<div style="margin-bottom:18px;border:1px solid #e8d7bf;border-radius:18px;background:#fffdf8;padding:18px;">
                <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#a14d1d;font-weight:800;">Gift message</div>
                <p style="margin:12px 0 0;color:#4b3b2d;font-size:16px;line-height:1.7;">${escapeHtml(input.giftMessage)}</p>
              </div>`
            : ''
        }
        ${deliveryInfo}
        <div style="color:#6f5a45;font-size:14px;line-height:1.6;">Order #${escapeHtml(input.orderNumber)} · Recipient: ${escapeHtml(input.recipientName)}</div>
      `,
    }),
  )
}

export async function sendPaymentFailedAdmin(orderNumber: string, customerName: string) {
  const subject = `Payment failed for order #${orderNumber} — ${customerName} — please follow up`
  const html = `
    <p style="font-family:Arial,sans-serif;font-size:16px;color:#111827;">
      Payment failed for order <strong>#${escapeHtml(orderNumber)}</strong> — ${escapeHtml(customerName)} — please follow up.
    </p>
  `
  return sendEmailToAddress(adminNotificationEmail(), subject, html)
}

export async function sendPaymentFailedCustomer(order: EmailOrder) {
  const to = orderRecipient(order)
  if (!to) {
    console.warn(`No customer email for payment failed notice on order ${order.order_number}`)
    return null
  }

  const subject = `Your payment failed for order #${order.order_number}`
  return sendEmailToAddress(
    to,
    subject,
    layout({
      preview: `Payment failed for Smoked Style order #${order.order_number}`,
      heading: 'Your payment did not go through',
      intro: `Your payment failed for order #${order.order_number}. Please contact us at ${CONTACT_PHONE} and we will help you complete your order.`,
      order,
      extra: `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:16px;margin:18px 0;color:#991b1b;line-height:1.5;">
          <p style="margin:0 0 6px;"><strong>Call or WhatsApp:</strong> ${CONTACT_PHONE}</p>
          <p style="margin:0;"><strong>Email:</strong> ${CONTACT_EMAIL}</p>
        </div>
        ${renderOrderTrackingButton(order.order_number)}
      `,
    }),
  )
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
      ${renderOrderTrackingButton(order.order_number)}
    `,
  }))
}
