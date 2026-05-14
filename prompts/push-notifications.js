module.exports =
  "Set up push notifications for the Smoked Style admin panel.\n\n" +
  "Use the Web Push API with Supabase Realtime as the trigger.\n\n" +
  "1. In the admin layout, request notification permission on first load.\n" +
  "2. Subscribe to Supabase Realtime on the orders table.\n" +
  "3. When a new order is inserted (INSERT event): \n" +
  "   - Play a notification sound (use a chime audio file)\n" +
  "   - Show a browser notification: 'New Order — [customer name] | $[total]'\n" +
  "   - Update the pending count badge on the Pending tab\n" +
  "   - Add the new order to the top of the Pending list without page refresh\n" +
  "4. When an order's status changes to 'delivered' (UPDATE event):\n" +
  "   - Play a different sound\n" +
  "   - Show notification: 'Delivered — Order #[number]'\n\n" +
  "Make sure the realtime subscription is cleaned up when the component unmounts.";
