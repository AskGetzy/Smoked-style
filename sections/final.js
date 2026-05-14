const { h1, h2, p, note, spacer, promptBox, makeTable } = require("../helpers");
const stripeWebhooksPrompt = require("../prompts/stripe-webhooks");
const emailSystemPrompt = require("../prompts/email-system");
const pushNotificationsPrompt = require("../prompts/push-notifications");
const deployVercelPrompt = require("../prompts/deploy-vercel");

module.exports = [
  // ── FINAL STEPS ────────────────────────────────────────────────────────
  h1("Final Steps Before Launch"),
  spacer(),
  h2("Stripe Webhook Setup"),
  promptBox("STRIPE WEBHOOKS", stripeWebhooksPrompt),
  spacer(),

  h2("Email Setup"),
  promptBox("EMAIL SYSTEM", emailSystemPrompt),
  spacer(),

  h2("Push Notifications Setup"),
  promptBox("PUSH NOTIFICATIONS", pushNotificationsPrompt),
  spacer(),

  h2("Step 19 — Deploy to Vercel"),
  promptBox("DEPLOY TO VERCEL", deployVercelPrompt),
  spacer(),

  h2("Build Order"),
  p("Follow this exact order when building. Do not skip steps."),
  spacer(),
  makeTable(
    ["Step", "What to Build", "Test"],
    [
      ["1", "Project setup + dependencies", "npm run dev works"],
      ["2", "Database schema", "Tables visible in Supabase dashboard"],
      ["3", "Seed data", "Products visible in Supabase"],
      ["4", "Catalog page", "Products display, Google Sign-In works"],
      ["5", "Cart page", "Add/remove items, notes save"],
      ["6", "Checkout page", "Order created in Supabase, card authorized in Stripe"],
      ["7", "Order confirmation page", "Shows correct order, email sends"],
      ["8", "Admin auth", "Login works, /admin routes protected"],
      ["9", "Orders dashboard", "All orders show, real-time updates work"],
      ["10", "Single order page", "Edit, approve, reject all work. Stripe charges on approve."],
      ["11", "Production report", "Correct totals show per day"],
      ["12", "Inventory management", "Stock edits save, history logs"],
      ["13", "Customer management", "Search, profile, backend order entry"],
      ["14", "Bulk order", "Excel upload, multi-stop order creation"],
      ["15", "Print labels", "ZPL downloads, packing slip prints"],
      ["16", "Stripe webhooks", "Test with Stripe CLI"],
      ["17", "Email system", "All 3 emails send correctly"],
      ["18", "Push notifications", "Sound and notification on new order"],
      ["19", "Deploy to Vercel", "Production URL works end to end"],
    ],
    [720, 5040, 3600],
  ),
  spacer(),

  h2("Important Notes for Cursor"),
  note("Always tell Cursor your stack at the start of every prompt: 'I am building with Next.js 14 App Router, Tailwind CSS, Supabase, and Stripe.'"),
  note("Never ask Cursor to build more than one screen per prompt. One screen, test, then next."),
  note("If something breaks, describe what is broken specifically. Do not say 'fix everything.'"),
  note("Stripe authorize/capture is critical — never use a regular payment intent. Always use capture_method: 'manual'."),
  note("Admin routes must always be protected by middleware. Test that /admin/orders redirects to login when logged out."),
  note("The Zebra printer uses ZPL language. Do not generate PDF or HTML labels for Zebra — it needs raw ZPL."),
  spacer(),

  h2("Contact Info"),
  makeTable(
    ["Field", "Details"],
    [
      ["Business", "Smoked Style"],
      ["Phone / WhatsApp", "(718) 810-9472"],
      ["Email", "Smokedstyle1@gmail.com"],
    ],
    [2500, 6860],
  ),
];
