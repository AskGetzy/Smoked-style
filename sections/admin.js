const { Paragraph, PageBreak } = require("docx");
const {
  h1,
  h2,
  h3,
  p,
  spacer,
  promptBox,
  bullet,
  divider,
} = require("../helpers");
const adminAuthPrompt = require("../prompts/admin-auth");
const adminOrdersPrompt = require("../prompts/admin-orders-dashboard");
const adminSingleOrderPrompt = require("../prompts/admin-single-order");
const adminProductionPrompt = require("../prompts/admin-production");
const adminInventoryPrompt = require("../prompts/admin-inventory");
const adminCustomersPrompt = require("../prompts/admin-customers");
const adminBulkPrompt = require("../prompts/admin-bulk-order");
const adminPrintLabelPrompt = require("../prompts/admin-print-label");

module.exports = [
  // ── ADMIN SCREENS ──────────────────────────────────────────────────────
  h1("Admin Backend Screens"),
  p("All admin screens live under app/admin/. They require admin authentication — email and password only, no Google Sign-In. Build the admin auth first before any admin screens."),
  spacer(),

  h2("Admin Auth Setup"),
  promptBox("ADMIN AUTHENTICATION", adminAuthPrompt),
  spacer(),
  divider(),

  h2("Screen 5 — Orders Dashboard"),
  h3("What this screen does"),
  p("The main admin screen. Shows all orders organized by status with search, filter, and quick actions. Also shows a summary bar and sends push notifications for new orders."),
  spacer(),
  promptBox("ADMIN ORDERS DASHBOARD", adminOrdersPrompt),
  spacer(),
  h3("Check before moving on"),
  bullet("Do summary stats show correct numbers?"),
  bullet("Do status tabs filter correctly?"),
  bullet("Does search work by name, order number, and phone?"),
  bullet("Does a new test order trigger a sound and notification?"),
  spacer(),
  divider(),

  h2("Screen 6 — Single Order View / Edit / Approve"),
  h3("What this screen does"),
  p("The most important admin screen. View full order details, edit items, adjust pricing, approve or reject, and print labels."),
  spacer(),
  promptBox("SINGLE ORDER PAGE", adminSingleOrderPrompt),
  spacer(),
  h3("Check before moving on"),
  bullet("Can you edit item quantities and see totals update?"),
  bullet("Can you add and remove items?"),
  bullet("Does the approve confirmation popup appear when total changes?"),
  bullet("Does approving an order charge the Stripe payment intent?"),
  bullet("Does inventory deduct automatically on approval?"),
  bullet("Does the approval email send to the customer?"),
  bullet("Does the ZPL label download?"),
  spacer(),
  divider(),

  h2("Screen 7 — Daily Production Report"),
  h3("What this screen does"),
  p("Shows what needs to be produced for any given day, split into confirmed (approved orders) and pending (unapproved orders)."),
  spacer(),
  promptBox("PRODUCTION REPORT PAGE", adminProductionPrompt),
  spacer(),
  h3("Check before moving on"),
  bullet("Does date navigation work — past and future dates?"),
  bullet("Do confirmed and pending orders show in separate panels?"),
  bullet("Are jerky items grouped by flavor with correct lb totals?"),
  bullet("Does print produce a clean readable layout?"),
  spacer(),
  divider(),

  h2("Screen 8 — Inventory Management"),
  promptBox("INVENTORY MANAGEMENT PAGE", adminInventoryPrompt),
  spacer(),
  divider(),

  h2("Screen 9 — Customer Management"),
  promptBox("CUSTOMER MANAGEMENT PAGE", adminCustomersPrompt),
  spacer(),
  divider(),

  h2("Screen 10 — Bulk Order Management"),
  promptBox("BULK ORDER MANAGEMENT", adminBulkPrompt),
  spacer(),
  divider(),

  h2("Screen 11 — Print Order Label"),
  promptBox("PRINT ORDER LABEL", adminPrintLabelPrompt),
  new Paragraph({ children: [new PageBreak()] }),
];
