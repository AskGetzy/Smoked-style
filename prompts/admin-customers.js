module.exports =
  "Build the customer management page at app/admin/customers/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase.\n\n" +
  "CUSTOMER LIST PAGE:\n" +
  "- Search bar at top: search by name, phone, or email (debounced, searches as you type)\n" +
  "- Sortable table/list: customer name, email, phone, total orders, total spent, last order date, tags, actions\n" +
  "- Tags shown as colored badges: VIP (gold), Wholesale (blue), Event Customer (purple)\n" +
  "- 'View' button opens customer profile\n\n" +
  "CUSTOMER PROFILE PAGE (app/admin/customers/[customerId]/page.tsx):\n\n" +
  "Top section:\n" +
  "- Name, email, phone (phone links to WhatsApp)\n" +
  "- Tags: multiselect dropdown to add/remove tags (VIP, Wholesale, Event Customer)\n" +
  "- Stats: Total Orders, Total Spent, Member Since\n" +
  "- Admin Notes: text area, auto-saves on blur\n\n" +
  "Order history section:\n" +
  "- List of all their orders: order number, date, status badge, items summary, total\n" +
  "- Each order links to the single order page\n\n" +
  "Payment section:\n" +
  "- Show Stripe saved card: last 4 digits and card brand (fetched via Stripe API using customer's stripe_customer_id)\n" +
  "- Note: 'Card securely stored by Stripe'\n\n" +
  "CREATE BACKEND ORDER button:\n" +
  "- Opens a full-page order creation form (app/admin/orders/new/page.tsx)\n" +
  "- Customer is pre-filled\n" +
  "- Can search and select any product from catalog with quantity/flavor/weight/size selectors\n" +
  "- Delivery area dropdown includes ALL areas including Personal Delivery and Uber\n" +
  "- Custom delivery fee input\n" +
  "- Date picker (no Saturday restriction needed for backend orders — admin manages this)\n" +
  "- Order notes and gift message\n" +
  "- Option to use card on file or enter new card\n" +
  "- When submitted: create order in Supabase with status 'pending' (or optionally 'approved' if admin wants to approve immediately — add a checkbox 'Approve immediately')\n\n" +
  "CUSTOMER SEARCH AUTOFILL:\n" +
  "- On the new order form, if no customer is pre-filled, show a customer search field that searches customers table as you type and auto-fills name, phone, email, and card on file when selected.";
