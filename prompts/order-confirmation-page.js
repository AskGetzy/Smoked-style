module.exports =
  "Build the order confirmation page at app/order-confirmation/[orderId]/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase.\n\n" +
  "LAYOUT:\n" +
  "- Large checkmark icon and heading: 'Your order has been received!'\n" +
  "- Order number displayed prominently (e.g. SS-2024-0001)\n" +
  "- Status bar showing 4 steps: Pending > Approved > Out for Delivery > Delivered. Current step highlighted.\n" +
  "- Message: 'Your order is pending approval. We will contact you shortly and you will only be charged once approved.'\n" +
  "- Order summary section: list all items with options, quantities, and prices\n" +
  "- Delivery details: area, address, date — or 'Pickup' if pickup order\n" +
  "- Payment: 'Card authorized — you will be charged [total] upon approval' with last 4 digits\n" +
  "- Gift message if present\n" +
  "- Contact section: 'Questions? Contact us:' — Phone/WhatsApp: (718) 810-9472, Email: Smokedstyle1@gmail.com\n" +
  "- 'View All My Orders' button linking to /account/orders\n\n" +
  "EMAIL (send via Supabase Edge Function or API route):\n" +
  "Send a confirmation email to the customer email address containing:\n" +
  "- Subject: 'Order Received — Smoked Style #[order_number]'\n" +
  "- Same information as the page above\n" +
  "- Pending approval message\n" +
  "- Contact info\n\n" +
  "Also create app/account/orders/page.tsx — a simple page showing the customer's order history with order number, date, status badge, total, and a 'View' link for each order.";
