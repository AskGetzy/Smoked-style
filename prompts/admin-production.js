module.exports =
  "Build the daily production report at app/admin/production/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase.\n\n" +
  "LAYOUT:\n" +
  "- Date navigation at top: left arrow, date display, right arrow. Default to today. Can navigate to any past or future date.\n" +
  "- Two side-by-side panels:\n\n" +
  "LEFT PANEL — 'Confirmed Production' (approved orders for selected date):\n" +
  "- Query orders where delivery_date = selected date AND status = 'approved' or 'out_for_delivery' or 'delivered'\n" +
  "- Group and sum order_items by product category and product name\n" +
  "- Display organized by category with category headers:\n\n" +
  "  JERKY:\n" +
  "  - General Tso: X lbs\n" +
  "  - Sweet And Spicy: X lbs\n" +
  "  (one row per flavor)\n\n" +
  "  STEAKS:\n" +
  "  - Hanger Steak: X pcs\n" +
  "  - Oyster Steak: X pcs\n" +
  "  (one row per cut)\n\n" +
  "  SMOKED:\n" +
  "  - Smoked Brisket Large: X units\n" +
  "  (one row per product)\n\n" +
  "  NON-SMOKED:\n" +
  "  - Beef Tongue: X units\n\n" +
  "  BOARDS:\n" +
  "  - Meat Board 12x18: X units\n" +
  "  (one row per board type and size)\n\n" +
  "- Print button for this panel only\n\n" +
  "RIGHT PANEL — 'Pending Production' (pending orders for selected date):\n" +
  "- Same layout and grouping\n" +
  "- Query orders where delivery_date = selected date AND status = 'pending'\n" +
  "- Show in muted/grey color to distinguish from confirmed\n" +
  "- Print button for this panel only\n\n" +
  "COMBINED PRINT button at top: prints both panels together.\n\n" +
  "If no orders for a panel, show: 'No orders for this date' in that panel.\n\n" +
  "Make the print layout clean and simple — black and white, large text, easy to read in a kitchen or production environment.";
