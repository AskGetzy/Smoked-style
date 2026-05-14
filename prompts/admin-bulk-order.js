module.exports =
  "Build the bulk order management page at app/admin/orders/bulk/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase, Stripe.\n\n" +
  "WHAT IS A BULK ORDER:\n" +
  "A single customer sends products to multiple recipients (up to 100 stops). Examples: Purim gifts, corporate orders. Each recipient can get a different product. One Stripe charge for the whole order.\n\n" +
  "PAGE LAYOUT:\n\n" +
  "STEP 1 — SELECT CUSTOMER:\n" +
  "- Customer search with autofill (same as customer management)\n" +
  "- Once selected, show customer name, phone, email, card on file\n\n" +
  "STEP 2 — UPLOAD RECIPIENTS:\n" +
  "- 'Download Excel Template' button — generates and downloads an .xlsx file with columns:\n" +
  "  Recipient Name | Phone Number | Delivery Address | Area | Item Name | Size/Options | Gift Message | Special Notes\n" +
  "- File upload input: accepts .xlsx and .csv\n" +
  "- On upload: parse the file, validate each row:\n" +
  "  - Required fields: Recipient Name, Delivery Address, Area, Item Name\n" +
  "  - Area must match one of the delivery areas in the database\n" +
  "  - Item Name must match a product name in the database\n" +
  "  - Flag any rows with errors in red\n" +
  "- Show a preview table of all rows (color code valid rows green, invalid rows red)\n\n" +
  "STEP 3 — REVIEW AND CONFIRM:\n" +
  "- Show total stops count\n" +
  "- Show itemized breakdown: X Meat Board 12x18, Y Jerky Board 10x15, etc.\n" +
  "- Show total amount to be charged\n" +
  "- Delivery fees: calculate per stop based on area\n" +
  "- Grand total\n" +
  "- 'Confirm Bulk Order' button\n\n" +
  "ON CONFIRM:\n" +
  "1. Create one parent order in Supabase with is_bulk_order = true, status = 'pending'\n" +
  "2. Create individual child order records for each stop, linked via parent_bulk_order_id\n" +
  "3. Create a Stripe PaymentIntent for the grand total (authorize only, capture_method: 'manual')\n" +
  "4. Show success message with bulk order ID\n\n" +
  "BULK ORDER IN ORDERS DASHBOARD:\n" +
  "- Parent bulk order appears as one row in the orders dashboard with a 'BULK — X stops' badge\n" +
  "- Clicking it shows all child orders listed below\n" +
  "- Approving the parent order approves all child orders and captures the Stripe charge\n" +
  "- Each child order gets its own label for printing\n\n" +
  "For the Excel template generation use the 'xlsx' npm package (npm install xlsx).";
