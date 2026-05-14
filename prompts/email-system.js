module.exports =
  "Set up transactional email for Smoked Style using Resend (npm install resend) or Supabase Edge Functions.\n\n" +
  "Create an email utility at lib/email.ts with functions for:\n\n" +
  "1. sendOrderConfirmation(order) — sent to customer when order is placed\n" +
  "2. sendOrderApproval(order) — sent to customer when order is approved and charged\n" +
  "3. sendOrderRejection(order, reason) — sent to customer when order is rejected\n\n" +
  "All emails must:\n" +
  "- Come from a Smoked Style email address\n" +
  "- Include order number in subject line\n" +
  "- Show order details clearly\n" +
  "- Include contact info: (718) 810-9472 | Smokedstyle1@gmail.com\n" +
  "- Be mobile-friendly HTML\n\n" +
  "Create API routes that call these functions:\n" +
  "- app/api/email/confirmation/route.ts\n" +
  "- app/api/email/approval/route.ts\n" +
  "- app/api/email/rejection/route.ts";
