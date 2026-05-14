module.exports =
  "Build the single order page at app/admin/orders/[orderId]/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase, Stripe.\n\n" +
  "PAGE LAYOUT — divided into sections:\n\n" +
  "SECTION 1 — ORDER HEADER:\n" +
  "- Order number, status badge, date placed\n" +
  "- Requested delivery date\n" +
  "- Assign to driver: dropdown or text input\n" +
  "- Action buttons: Approve, Reject, Save Edits, Print Label, Print Packing Slip\n\n" +
  "SECTION 2 — CUSTOMER INFO:\n" +
  "- Name, phone (click for WhatsApp link), email\n" +
  "- Delivery address or 'Pickup'\n" +
  "- Delivery area\n" +
  "- Customer history: 'X orders | $Y total spent | Customer since [date]'\n\n" +
  "SECTION 3 — ORDER ITEMS (editable):\n" +
  "Each item row:\n" +
  "- Photo, name, selected options (flavor, weight, size)\n" +
  "- Quantity: editable number input\n" +
  "- Unit price (display only)\n" +
  "- Line total (auto-calculated)\n" +
  "- Remove button (X)\n" +
  "Add Item button: opens a product search modal to add any catalog item to the order.\n\n" +
  "SECTION 4 — NOTES:\n" +
  "- Order notes (editable text area)\n" +
  "- Gift message (editable text input)\n\n" +
  "SECTION 5 — PAYMENT SUMMARY:\n" +
  "- Subtotal (auto-calculated from items)\n" +
  "- Delivery fee (editable number input)\n" +
  "- Custom adjustment: text input for description + number input for amount (can be negative for discounts)\n" +
  "  Examples: 'Friday surcharge +$15' or 'Loyal customer -$20'\n" +
  "- Total (auto-calculated)\n" +
  "- Card: last 4 digits\n" +
  "- Status: Authorized / Charged\n\n" +
  "APPROVE FLOW:\n" +
  "1. Admin clicks Approve\n" +
  "2. If total has changed from original authorized amount: show a confirmation modal:\n" +
  "   'Order total has changed. Original: $X | New total: $Y | Difference: $Z. Confirm and charge $Y?'\n" +
  "   with Confirm and Cancel buttons.\n" +
  "3. If confirmed (or total unchanged): call Stripe API to capture the payment intent for the new total.\n" +
  "4. Update order status to 'approved' in Supabase.\n" +
  "5. Deduct inventory: for each order item, subtract quantity from the product's stock_quantity in Supabase. Log to stock_history table.\n" +
  "6. Send approval email to customer: 'Your Smoked Style order #[number] has been approved and your card has been charged $[total]. Delivery date: [date]. Questions? (718) 810-9472 | Smokedstyle1@gmail.com'\n\n" +
  "REJECT FLOW:\n" +
  "1. Admin clicks Reject\n" +
  "2. Show modal with a reason text input\n" +
  "3. On confirm: cancel the Stripe PaymentIntent (release authorization)\n" +
  "4. Update order status to 'cancelled'\n" +
  "5. Send rejection email to customer with the reason\n\n" +
  "SAVE EDITS:\n" +
  "- Saves all changes to Supabase without approving or charging.\n" +
  "- Recalculates subtotal and total.\n\n" +
  "PRINT LABEL:\n" +
  "- Generate a ZPL string for Zebra printer label containing: order number, customer name, phone, delivery address, delivery date, items list, gift message, notes, driver name if assigned, QR code linking to order URL.\n" +
  "- Provide a 'Download ZPL' button and a 'Print' button (uses browser print with ZPL in a pre tag for Zebra direct print).\n\n" +
  "PRINT PACKING SLIP:\n" +
  "- Generate a printable HTML page (opens in new tab) with: Smoked Style logo text, order number, customer name, all items with quantities, gift message, notes, thank you message. No prices.";
