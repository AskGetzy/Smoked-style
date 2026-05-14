module.exports =
  "Build the checkout page at app/checkout/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase, Stripe.\n\n" +
  "Build a 4-step checkout flow with a progress indicator at the top showing: Contact Info > Delivery > Date > Payment.\n\n" +
  "STEP 1 — CONTACT INFO:\n" +
  "- Full Name (pre-filled from Google account)\n" +
  "- Email (pre-filled from Google account, required)\n" +
  "- Phone Number (pre-filled if available, required)\n" +
  "- All fields editable. All required.\n\n" +
  "STEP 2 — DELIVERY OR PICKUP:\n" +
  "- Two large option cards: 'Delivery' and 'Pickup'\n" +
  "- If DELIVERY selected:\n" +
  "  - Delivery Area dropdown: fetch from delivery_areas table where is_backend_only = false. Show area name and delivery fee next to each option.\n" +
  "  - Recipient Name (text input)\n" +
  "  - Delivery Address (text input)\n" +
  "  - Recipient Phone (text input)\n" +
  "  - Delivery fee updates automatically when area is selected.\n" +
  "- If PICKUP selected:\n" +
  "  - Show pickup address: 'Pickup available — contact us for location details'\n" +
  "  - No address fields needed.\n\n" +
  "STEP 3 — DATE:\n" +
  "- Calendar date picker.\n" +
  "- Block all Saturdays (day 6) — make them unselectable and greyed out.\n" +
  "- Friday dates: selectable but show a small warning badge: 'Friday delivery may have limited availability'\n" +
  "- All other days fully available including same day.\n" +
  "- Customer can pick any date — no max limit.\n\n" +
  "STEP 4 — PAYMENT:\n" +
  "- If customer has a Stripe saved card on file: show card summary (e.g. 'Visa ending in 4242') with option to use it or add a new card.\n" +
  "- If no saved card: show Stripe Elements card input form.\n" +
  "- Show full order summary: all items, delivery fee, total.\n" +
  "- IMPORTANT: Use Stripe's authorize-only flow (payment_intent with capture_method: 'manual'). Do NOT capture the payment here.\n" +
  "- 'Place Order' button.\n" +
  "- Below button: 'Your order is pending approval. You will not be charged until we approve your order.'\n\n" +
  "ON SUBMIT:\n" +
  "1. Create a Stripe PaymentIntent with capture_method: 'manual' for the order total.\n" +
  "2. Confirm the payment intent (authorize only — no charge).\n" +
  "3. Create a new order record in Supabase orders table with status: 'pending'.\n" +
  "4. Create order_items records for each cart item.\n" +
  "5. Clear the cart.\n" +
  "6. Redirect to /order-confirmation/[order_id].\n\n" +
  "Handle errors gracefully. If Stripe fails, show error message and do not create the order.";
