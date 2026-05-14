module.exports =
  "Build the admin orders dashboard at app/admin/orders/page.tsx for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase Realtime.\n\n" +
  "SUMMARY BAR (top of page, 4 stat cards):\n" +
  "- Total Orders Today\n" +
  "- Total Pending\n" +
  "- Total Approved\n" +
  "- Revenue Today (sum of totals for approved/delivered orders with delivery_date = today)\n\n" +
  "STATUS TABS:\n" +
  "Pending | Approved | Out for Delivery | Delivered | Cancelled | All Orders\n" +
  "Show count badge on each tab.\n\n" +
  "SEARCH AND FILTER BAR:\n" +
  "- Search input: searches by customer name, order number, phone\n" +
  "- Filter by date (date picker)\n" +
  "- Filter by delivery area (dropdown)\n" +
  "- Filter by type (delivery / pickup)\n" +
  "- Sort by: date placed, delivery date, order total\n\n" +
  "ORDER CARDS:\n" +
  "Each order shows:\n" +
  "- Order number\n" +
  "- Customer name and phone (click phone to open WhatsApp)\n" +
  "- Date placed and requested delivery date\n" +
  "- Delivery area or 'Pickup'\n" +
  "- Order total\n" +
  "- Brief items summary (e.g. 'Smoked Brisket x1, Jerky 2lb x2...')\n" +
  "- Status badge (color coded: yellow=pending, green=approved, blue=out for delivery, grey=delivered, red=cancelled)\n" +
  "- Assign to driver dropdown (fetch from admin_users where role includes driver — for Phase 2, just show a text input for driver name for now)\n" +
  "- Action buttons: View (link to single order page), Approve (quick approve), Reject (quick reject)\n\n" +
  "REAL-TIME UPDATES:\n" +
  "- Use Supabase Realtime to subscribe to the orders table.\n" +
  "- When a new order is inserted: play a notification sound AND show a browser push notification saying 'New order received — [customer name]'\n" +
  "- When an order status changes to 'delivered': play a different sound and show notification 'Order [number] delivered'\n" +
  "- Update the dashboard in real time without page refresh.\n\n" +
  "For the notification sound: use a simple Audio element with a short chime sound file.";
