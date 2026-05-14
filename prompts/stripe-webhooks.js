module.exports =
  "Set up a Stripe webhook handler at app/api/webhooks/stripe/route.ts for Smoked Style.\n\n" +
  "Handle the following Stripe events:\n\n" +
  "payment_intent.canceled:\n" +
  "- Find the order with this payment_intent_id in Supabase\n" +
  "- Update status to 'cancelled' if not already\n\n" +
  "payment_intent.payment_failed:\n" +
  "- Find the order\n" +
  "- Update a payment_failed flag\n" +
  "- Send email to admin: 'Payment failed for order #[number] — [customer name]'\n\n" +
  "charge.refunded:\n" +
  "- Log the refund against the order\n\n" +
  "Verify all incoming webhooks using the STRIPE_WEBHOOK_SECRET. Reject any requests that fail verification.\n\n" +
  "Register this webhook URL in your Stripe dashboard under Developers > Webhooks.";
