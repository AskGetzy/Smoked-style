const { Paragraph, PageBreak } = require("docx");
const { h1, h2, h3, p, spacer, promptBox, bullet, divider } = require("../helpers");
const catalogPrompt = require("../prompts/catalog-page");
const cartPrompt = require("../prompts/cart-page");
const checkoutPrompt = require("../prompts/checkout-page");
const orderConfirmationPrompt = require("../prompts/order-confirmation-page");

module.exports = [
  // ── CUSTOMER SCREENS ───────────────────────────────────────────────────
  h1("Customer-Facing Screens"),
  p("Build these screens in order. Test each one before moving to the next."),
  spacer(),

  h2("Screen 1 — Catalog Page"),
  h3("What this screen does"),
  p(
    "This is the main shop page. Customers browse all products organized by category. They can see the full catalog without signing in, but must sign in with Google to add items to their cart.",
  ),
  spacer(),
  promptBox("CATALOG PAGE", catalogPrompt),
  spacer(),
  h3("Check before moving on"),
  bullet("Can you browse products without signing in?"),
  bullet("Does clicking Add to Cart prompt Google Sign In if not logged in?"),
  bullet("Does the Jerky selector show all 6 flavors and all weight options with correct prices?"),
  bullet("Do out of stock products appear greyed out with no Add to Cart?"),
  bullet("Do category tabs filter correctly?"),
  spacer(),
  divider(),

  h2("Screen 2 — Cart"),
  h3("What this screen does"),
  p("Shows everything in the cart with the ability to edit quantities, add notes, and proceed to checkout. Also shows suggested items and lets customers reorder past orders."),
  spacer(),
  promptBox("CART PAGE", cartPrompt),
  spacer(),
  h3("Check before moving on"),
  bullet("Can you change quantities and remove items?"),
  bullet("Does the out-of-stock warning appear and block checkout?"),
  bullet("Do order notes and gift message save?"),
  bullet("Do suggested items appear and can be added to cart?"),
  bullet("Does reorder work and skip out-of-stock items with a message?"),
  spacer(),
  divider(),

  h2("Screen 3 — Checkout"),
  h3("What this screen does"),
  p("Multi-step form: contact info, delivery or pickup selection, date picker, and payment. Card is authorized but NOT charged until admin approves the order."),
  spacer(),
  promptBox("CHECKOUT PAGE", checkoutPrompt),
  spacer(),
  h3("Check before moving on"),
  bullet("Does the delivery area dropdown show all areas with correct fees?"),
  bullet("Are Saturdays blocked on the calendar?"),
  bullet("Do Fridays show the warning badge?"),
  bullet("Is the card authorized but NOT charged after placing order?"),
  bullet("Is the order created in Supabase with status 'pending'?"),
  bullet("Is the cart cleared after successful order?"),
  spacer(),
  divider(),

  h2("Screen 4 — Order Confirmation"),
  h3("What this screen does"),
  p("Shows after a successful order is placed. Confirms the order is pending approval and sends an email."),
  spacer(),
  promptBox("ORDER CONFIRMATION PAGE", orderConfirmationPrompt),
  spacer(),
  h3("Check before moving on"),
  bullet("Does the confirmation page load with correct order details?"),
  bullet("Is the status bar showing 'Pending' as current step?"),
  bullet("Does the customer receive a confirmation email?"),
  bullet("Does the order history page show the order?"),
  new Paragraph({ children: [new PageBreak()] }),
];
