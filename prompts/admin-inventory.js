module.exports =
  "Build the inventory management page at app/admin/inventory/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase.\n\n" +
  "LAYOUT:\n" +
  "- Category tabs at top: All | Jerky | Steaks | Smoked | Non-Smoked | Boards\n" +
  "- Product grid filtered by selected tab\n\n" +
  "EACH PRODUCT CARD:\n" +
  "- Placeholder product image\n" +
  "- Product name (and size/flavor if applicable)\n" +
  "- Current stock: editable number input. Click to edit, click save to commit.\n" +
  "- Low stock threshold: editable number input (set per product)\n" +
  "- In Stock / Out of Stock toggle switch\n" +
  "- If stock <= threshold: show red 'Low Stock' badge\n" +
  "- If is_in_stock = false: show grey 'Out of Stock' badge\n" +
  "- 'View History' button: shows a modal with the stock_history log for this product\n\n" +
  "STOCK HISTORY MODAL:\n" +
  "- Table showing: Date, Changed By (admin name), Previous Stock, Change Amount (+/-), New Stock, Reason\n" +
  "- Sorted by most recent first\n\n" +
  "WHEN STOCK IS EDITED:\n" +
  "- Save the new value to products.stock_quantity\n" +
  "- Insert a record into stock_history: who changed it, previous value, new value, timestamp\n" +
  "- If new stock > 0 and is_in_stock was false: automatically set is_in_stock = true\n\n" +
  "NOTE for Jerky: since all jerky flavors share one product row, show one card per flavor. Store flavor stock as a JSON field jerky_flavor_stock: { 'General Tso': 12.5, 'BBQ': 8.0 } on the jerky product row.\n\n" +
  "At the top of the page, show a summary: total products low on stock (count) and total out of stock (count).";
