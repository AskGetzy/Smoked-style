module.exports =
  "Build the cart page at app/cart/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase.\n\n" +
  "LAYOUT:\n" +
  "- Same header as catalog page (reuse the Header component)\n" +
  "- Left column (2/3 width): cart items list\n" +
  "- Right column (1/3 width): order summary and checkout button\n\n" +
  "CART ITEMS LIST:\n" +
  "Each item row shows:\n" +
  "- Product photo (placeholder)\n" +
  "- Product name and selected options (e.g. 'Jerky — General Tso, 2 lbs' or 'Meat Board — 12x18')\n" +
  "- Quantity controls: minus button, quantity number, plus button\n" +
  "- Line total (quantity x unit price)\n" +
  "- Remove item (X) button\n" +
  "- For Jerky items: small edit link to change flavor or weight\n\n" +
  "If cart is empty: show friendly message and a 'Continue Shopping' button back to catalog.\n\n" +
  "If any cart item is now out of stock (is_in_stock = false in products table): highlight that row in red with message 'This item is no longer available' and disable it. Do not let user proceed to checkout until they remove it.\n\n" +
  "ORDER NOTES:\n" +
  "- Text area labeled 'Order Notes (optional)' — e.g. 'Please slice the brisket'\n\n" +
  "GIFT MESSAGE:\n" +
  "- Text input labeled 'Gift Message (optional)' — e.g. 'Happy Purim!' Will be printed on the label.\n\n" +
  "ORDER SUMMARY (right column):\n" +
  "- Subtotal\n" +
  "- Delivery fee: show 'Calculated at checkout'\n" +
  "- Total\n" +
  "- Proceed to Checkout button (requires sign in)\n\n" +
  "SUGGESTED ITEMS:\n" +
  "- Below the cart, show a horizontal scroll row of 4-6 suggested products.\n" +
  "- Logic: if cart contains a Smoked item, suggest other Smoked items not already in cart. If cart contains Jerky, suggest Boards. Skip any out-of-stock items.\n" +
  "- Each suggestion shows photo, name, price, and an Add button.\n\n" +
  "REORDER:\n" +
  "- Show a collapsible section 'Reorder a Past Order' below suggested items.\n" +
  "- Fetch the customer's last 5 orders from Supabase orders table (where customer_id = current user).\n" +
  "- Show each past order with date, item count, and a 'Reorder' button.\n" +
  "- Clicking Reorder adds all items from that order back to the cart, skipping any that are now out of stock, and shows a toast: 'Added to cart. 2 items were out of stock and were skipped.'\n\n" +
  "Save order notes and gift message to the cart state in Supabase.";
