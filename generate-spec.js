const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');
const path = require('path');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "2E4057" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, color: "2E4057" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: "C85C2D" })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: "2E4057" })]
  });
}

function p(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22 })]
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, bold })]
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun("")] });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: headerBorders,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: "2E4057", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })] })]
        }))
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, i) => new TableCell({
          borders,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? "F8F8F8" : "FFFFFF", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })] })]
        }))
      }))
    ]
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    }]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "2E4057" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "C85C2D" },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [

      // COVER
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 400 },
        children: [new TextRun({ text: "SMOKED STYLE", bold: true, size: 64, color: "2E4057" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: "Phase 1 — Full Product Specification", size: 36, color: "C85C2D" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: "For use with Firebase Studio Agent", size: 24, color: "888888" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 800 },
        children: [new TextRun({ text: "(718) 810-9472  |  Smokedstyle1@gmail.com", size: 22, color: "888888" })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // OVERVIEW
      h1("Project Overview"),
      p("Smoked Style is a premium smoked meats business selling jerky, smoked meats, steaks, and boards. This document defines the complete specification for Phase 1 of the Smoked Style web platform, covering the customer-facing storefront and the admin backend."),
      p("The system is built around an order approval workflow: customers place orders and authorize their card, the office reviews and approves each order (making any edits needed), and only then is the card charged. This gives Smoked Style full control during peak seasons like Purim."),
      spacer(),

      h2("Tech Stack"),
      bullet("Frontend & Backend: Firebase Studio (Next.js)"),
      bullet("Database: Firestore"),
      bullet("Authentication: Google Sign-In (customers), Email/Password (admin)"),
      bullet("Payments: Stripe (authorize/capture flow, saved cards)"),
      bullet("Push Notifications: Firebase Cloud Messaging"),
      bullet("Label Printing: Zebra ZPL format"),
      bullet("Route Optimization: Google Maps Routes API"),
      spacer(),

      h2("Business Rules — Global"),
      bullet("All orders require approval before the card is charged"),
      bullet("Card is authorized at checkout, charged only on approval"),
      bullet("Admin can edit any order before or after approval"),
      bullet("Any edit that changes the total requires a confirmation step before charging"),
      bullet("Only admin can cancel orders"),
      bullet("No Saturday deliveries"),
      bullet("Same-day orders allowed — approval system handles feasibility"),
      bullet("Default delivery fee: $30, editable per order in admin"),
      bullet("Real-time inventory: approving an order auto-deducts stock"),
      new Paragraph({ children: [new PageBreak()] }),

      // CATALOG
      h1("Complete Product Catalog"),
      spacer(),

      h2("Category: Jerky"),
      p("Sold by weight. Customer selects flavor and weight. Inventory tracked per flavor in lbs."),
      spacer(),
      makeTable(
        ["Attribute", "Details"],
        [
          ["Price", "$100 per lb"],
          ["Min weight", "0.5 lb"],
          ["Max weight", "10 lbs"],
          ["Weight increments", "0.5 lb steps (0.5, 1.0, 1.5 ... 10.0)"],
          ["Flavors", "General Tso, Sweet & Spicy, Jalapeno, Pepper Crust, BBQ, Teriyaki"],
          ["Inventory", "Tracked per flavor in lbs"],
          ["Customization", "Customer picks flavor and weight"],
        ],
        [3120, 6240]
      ),
      spacer(),

      h2("Category: Steaks"),
      p("Sold per piece. Customer selects quantity. Inventory tracked per cut in pieces."),
      spacer(),
      makeTable(
        ["Product", "Price", "Sold As", "Notes"],
        [
          ["Hanger Steak", "$200", "Per piece", "Customer picks qty"],
          ["Oyster Steak", "$30", "Per piece", "Customer picks qty"],
          ["Rib Roast", "$500", "Per piece", "Customer picks qty"],
          ["Skirt Steak", "$200", "Pack of 4 pcs", "Inventory in packs of 4"],
          ["Surprise Steak", "$200", "Per piece", "Customer picks qty"],
        ],
        [2500, 1500, 2000, 3360]
      ),
      spacer(),

      h2("Category: Boards"),
      p("All boards are fixed — no customization. Inventory tracked per board unit. All available daily."),
      spacer(),
      h3("Jerky Boards — 3 flavors jerky + charcuterie"),
      makeTable(
        ["Size", "Price"],
        [["8x12", "$80"], ["10x15", "$125"], ["12x18", "$200"]],
        [4680, 4680]
      ),
      spacer(),
      h3("Meat Boards — Tongue, charcuterie, jerky, smoked meat, steak and more"),
      makeTable(
        ["Size", "Price"],
        [
          ["8x12", "$100"],
          ["10x15", "$175"],
          ["12x18", "$250"],
          ["18x26", "$500"],
          ["18x52", "$1,000"],
          ["18x52 + 1 elevated round tray", "$1,500"],
          ["18x52 + 2 elevated round trays", "$2,000"],
        ],
        [4680, 4680]
      ),
      spacer(),
      h3("Steak Boards — Skirt steak, surprise steak, oyster steak, beef wellington, jerky"),
      makeTable(
        ["Size", "Price"],
        [["8x12", "$185"], ["10x15", "$275"], ["12x18", "$400"]],
        [4680, 4680]
      ),
      spacer(),
      h3("Carpaccio"),
      makeTable(
        ["Item", "Price"],
        [["14x14 Tray — with sauces on the side", "$75"]],
        [4680, 4680]
      ),
      spacer(),

      h2("Category: Smoked"),
      p("All items sold per unit or per pan as noted. Inventory tracked per item."),
      spacer(),
      makeTable(
        ["Product", "Description", "Price", "Sold As"],
        [
          ["Smoked Brisket 2nd Cut", "Smaller piece, approx 2 lbs", "$75", "Each"],
          ["Smoked Brisket Large", "One big piece, 10-15 lbs", "$350", "Each"],
          ["Smoked Chicken Wings", "9x13 pan, sweet & spicy sauce", "$90", "Per pan"],
          ["Smoked Flanken Roast (Boneless)", "Light sauce glaze", "$125", "Each"],
          ["Smoked Flanken 3 Bones", "Smoked with sauce", "$350", "Each"],
          ["Smoked French Roast", "Soft, not too fatty, great cold", "$125", "Each"],
          ["Smoked Lamb Riblets", "Fatty and very tender", "$75", "Each"],
          ["Smoked Lamb Side", "Full side, herbs & spices, 15-20 lbs", "$450", "Each"],
          ["Smoked Pastrami (Brisket)", "Best seller, approx 15 lbs", "$500", "Each"],
          ["Smoked Pulled Meat", "Pulled flanken, great for events", "$110", "Per pan"],
          ["Smoked Pulled Meat With Gnocchi", "Pulled flanken, gnocchi, special sauce", "$150", "Per pan"],
          ["Smoked Rack Of Lamb", "Lamb ribs smoked to medium", "$300", "Each"],
          ["Smoked Rib Roast", "Approx 15 lbs, smoked to medium, great for carving", "$500", "Each"],
          ["Smoked Veal Roast", "Veal neck roast, soft and tasty", "$450", "Each"],
        ],
        [2800, 3200, 1200, 2160]
      ),
      spacer(),

      h2("Category: Non-Smoked"),
      spacer(),
      makeTable(
        ["Product", "Description", "Price", "Sold As"],
        [
          ["Beef Tongue", "1 big non-smoked tongue, soft & fatty", "$250", "Each"],
          ["Beef Wellington", "Lean steak, mushrooms, charcuterie, flaky dough", "$150", "Each"],
          ["Beef Wellington Large", "For bigger families or carving stations", "$400", "Each"],
          ["Finger Meat", "Non-smoked, soft & tasty, with sauce", "$100", "9x13 pan"],
        ],
        [2500, 3500, 1500, 1860]
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // DELIVERY
      h1("Delivery & Pickup Rules"),
      spacer(),
      h2("Delivery Areas"),
      makeTable(
        ["Area", "Default Fee", "Notes"],
        [
          ["Williamsburg", "$30", "Editable in admin"],
          ["Boro Park", "$30", "Editable in admin"],
          ["Monsey", "$30", "Editable in admin"],
          ["Lakewood", "$30", "Editable in admin"],
          ["Monroe", "$30", "Editable in admin"],
          ["5 Towns", "$30", "Editable in admin"],
          ["Catskills", "$30", "Editable in admin"],
          ["Other", "Set manually", "Customer enters address, admin sets fee at approval"],
          ["Personal Delivery", "Set manually", "Backend only — not shown to customers"],
          ["Uber", "Set manually", "Backend only — not shown to customers"],
        ],
        [2500, 2000, 5220]
      ),
      spacer(),
      h2("Delivery Rules"),
      bullet("No deliveries on Saturday — blocked on calendar"),
      bullet("Friday deliveries available with a warning note: 'Friday delivery may have limited availability'"),
      bullet("Same-day orders allowed — approval system handles feasibility"),
      bullet("No minimum order amount"),
      bullet("Customer pays per delivery, not per item"),
      bullet("All products available daily — approval system is the control valve"),
      spacer(),
      h2("Pickup Rules"),
      bullet("One pickup location"),
      bullet("Customer picks date only, no time slot"),
      bullet("No Saturday pickup"),
      new Paragraph({ children: [new PageBreak()] }),

      // CUSTOMER SCREENS
      h1("Customer-Facing Screens"),
      spacer(),

      h2("Screen 1 — Catalog / Shop Page"),
      h3("Layout"),
      bullet("Header: logo, cart icon with item count and running total, Google Sign In button"),
      bullet("Purim Special section at top — only visible when toggled ON in admin backend"),
      bullet("Best Sellers section — always visible, auto-calculated by most ordered"),
      bullet("Category tabs: Jerky, Steaks, Smoked, Non-Smoked, Boards"),
      bullet("Product grid: photo, name, short description, price, Add to Cart button"),
      bullet("Out of stock items: greyed out, 'Out of Stock' badge, no Add to Cart button"),
      spacer(),
      h3("Product Interaction"),
      bullet("Jerky: opens flavor + weight selector before adding to cart"),
      bullet("Steaks: opens quantity selector"),
      bullet("Boards: opens size selector where multiple sizes exist"),
      bullet("Smoked / Non-Smoked: opens quantity selector"),
      spacer(),
      h3("Access Rules"),
      bullet("Catalog visible to everyone — no sign-in required to browse"),
      bullet("Prices visible to everyone"),
      bullet("Google Sign-In required when adding to cart — triggers sign-in prompt if not logged in"),
      spacer(),
      h3("Admin Controls for this Screen"),
      bullet("Purim Special section: toggle on/off, manually assign products"),
      bullet("Best Sellers: auto-calculated, no manual curation needed"),
      bullet("Inventory: out of stock status reflects automatically from inventory management"),
      spacer(),

      h2("Screen 2 — Cart"),
      h3("Layout"),
      bullet("List of all items: photo, name, selected options (flavor/weight/size), quantity, line total"),
      bullet("Edit quantity or remove item directly in cart"),
      bullet("For Jerky: ability to change flavor and weight from cart"),
      bullet("Order summary: subtotal, delivery fee (TBD until checkout), total"),
      bullet("General order notes field — one note for the whole order"),
      bullet("Gift message field — optional, printed on label or included with delivery"),
      bullet("Suggested items section at bottom — auto-generated based on cart contents, skips out-of-stock"),
      bullet("Reorder button — pulls a past order back into cart, skips out-of-stock with warning"),
      bullet("Proceed to Checkout button"),
      spacer(),
      h3("Business Rules"),
      bullet("Cart saves if customer leaves and comes back"),
      bullet("If item goes out of stock while in cart: flagged with warning 'This item is no longer available'"),
      bullet("No minimum order, no promo codes"),
      spacer(),

      h2("Screen 3 — Checkout"),
      h3("Step 1 — Contact Info"),
      bullet("Name, email, phone — auto-filled from Google account"),
      bullet("All three fields editable"),
      bullet("All three fields required"),
      spacer(),
      h3("Step 2 — Delivery or Pickup"),
      bullet("Two options: Delivery or Pickup"),
      bullet("Delivery: area dropdown, recipient name, full address, phone number"),
      bullet("Delivery fee shown automatically based on area selected — defaults to $30"),
      bullet("Pickup: one location address shown, customer picks date"),
      bullet("Personal Delivery and Uber not shown — backend only"),
      spacer(),
      h3("Step 3 — Date Selection"),
      bullet("Calendar date picker"),
      bullet("Saturday blocked — not selectable"),
      bullet("Friday available with note: 'Friday delivery may have limited availability'"),
      bullet("Same-day ordering allowed"),
      bullet("No maximum booking window"),
      spacer(),
      h3("Step 4 — Payment"),
      bullet("Returning customers: saved card shown (last 4 digits), option to use it or add new card"),
      bullet("New customers: enter card details"),
      bullet("Card is AUTHORIZED only — not charged until order is approved"),
      bullet("Order total shown clearly including delivery fee"),
      spacer(),
      h3("Step 5 — Review and Place Order"),
      bullet("Full order summary: items, options, notes, gift message, area, date, total"),
      bullet("Place Order button"),
      bullet("Clear message: 'Your order is pending approval. You will not be charged until approved.'"),
      spacer(),

      h2("Screen 4 — Order Confirmation Page"),
      h3("Layout"),
      bullet("Large confirmation message: 'Your order has been received!'"),
      bullet("Auto-generated order number"),
      bullet("Full order summary: items, options, quantities, total"),
      bullet("Delivery or pickup details: area, address, date"),
      bullet("Payment info: last 4 digits of card, authorized amount"),
      bullet("Gift message if added"),
      bullet("Order status bar: Pending > Approved > Out for Delivery > Delivered"),
      bullet("Pending approval message"),
      bullet("View My Orders button"),
      bullet("Contact info: Smoked Style | (718) 810-9472 | Smokedstyle1@gmail.com"),
      spacer(),
      h3("Confirmation Email — Sent Immediately"),
      bullet("Same info as confirmation page"),
      bullet("Order number"),
      bullet("Pending approval message"),
      bullet("Contact info"),
      bullet("Status bar"),
      new Paragraph({ children: [new PageBreak()] }),

      // ADMIN SCREENS
      h1("Admin Backend Screens"),
      spacer(),

      h2("Access Levels"),
      makeTable(
        ["Level", "Who", "Permissions"],
        [
          ["Owner", "Business owner", "Everything: approve, reject, edit, charge, manage inventory, manage users, all reports, all settings"],
          ["Office Staff", "Team members", "View, edit, approve, reject orders, manage inventory, add backend orders"],
          ["Driver", "Delivery staff", "Separate driver app only — route, deliveries, proof of delivery"],
        ],
        [1800, 2200, 5360]
      ),
      spacer(),

      h2("Screen 5 — Admin Login"),
      bullet("Smoked Style logo"),
      bullet("Email and password login — no Google Sign-In for admin"),
      bullet("No self-registration — accounts created by owner only"),
      bullet("Forgot password link"),
      bullet("Locked out after 5 failed attempts"),
      bullet("Auto logout after inactivity"),
      bullet("Mobile friendly"),
      bullet("Driver login is a separate app — Phase 2"),
      spacer(),

      h2("Screen 6 — Orders Dashboard"),
      h3("Summary Bar at Top"),
      bullet("Total orders today"),
      bullet("Total pending"),
      bullet("Total approved"),
      bullet("Total revenue today"),
      spacer(),
      h3("Tabs"),
      bullet("Pending — new orders waiting for approval"),
      bullet("Approved — approved, not yet out for delivery"),
      bullet("Out for Delivery — assigned to driver, on the way"),
      bullet("Delivered — completed, marked by driver"),
      bullet("Cancelled — rejected or cancelled orders"),
      bullet("All Orders — everything in one view"),
      spacer(),
      h3("Each Order Card Shows"),
      bullet("Order number"),
      bullet("Customer name and phone (click to call or WhatsApp)"),
      bullet("Order date and requested delivery date"),
      bullet("Delivery area or pickup"),
      bullet("Order total"),
      bullet("Items summary"),
      bullet("Status badge"),
      bullet("Assign to driver dropdown"),
      bullet("Quick action buttons: Approve, Reject, Edit, View"),
      spacer(),
      h3("Search and Filter"),
      bullet("Search by customer name, order number, phone"),
      bullet("Filter by date, area, status, delivery vs pickup"),
      bullet("Sort by date placed, delivery date, order total"),
      spacer(),
      h3("Notifications"),
      bullet("New order placed: loud alert + badge on admin app"),
      bullet("Order delivered by driver: loud alert + badge on admin app"),
      bullet("Firebase Cloud Messaging push notifications"),
      spacer(),

      h2("Screen 7 — Single Order View / Edit / Approve"),
      h3("Top Section"),
      bullet("Order number, status badge, date placed, requested delivery date"),
      bullet("Assigned driver dropdown"),
      spacer(),
      h3("Customer Info"),
      bullet("Name, phone, email"),
      bullet("Click to call or WhatsApp directly from screen"),
      bullet("Delivery address or pickup note"),
      bullet("Delivery area and charge"),
      bullet("Customer history: total orders, total spent, member since"),
      spacer(),
      h3("Order Items"),
      bullet("Each item: photo, name, options, quantity, unit price, line total"),
      bullet("Edit quantity, flavor, weight, or size per item"),
      bullet("Remove item button"),
      bullet("Add item from catalog button"),
      bullet("Order notes field"),
      bullet("Gift message field"),
      spacer(),
      h3("Payment Section"),
      bullet("Subtotal"),
      bullet("Delivery fee — editable"),
      bullet("Custom adjustment line: description + amount (positive or negative) — e.g. 'Friday surcharge +$10' or 'Loyal customer -$20'"),
      bullet("Total"),
      bullet("Card last 4 digits"),
      bullet("Authorization status"),
      spacer(),
      h3("Confirmation Popup on Total Change"),
      bullet("Triggered any time an edit changes the order total"),
      bullet("Shows: original total, new total, difference"),
      bullet("Confirm or Cancel buttons"),
      spacer(),
      h3("Action Buttons"),
      bullet("Approve: triggers charge at current total, sends approval email to customer"),
      bullet("Reject: releases card authorization, sends rejection email with reason field"),
      bullet("Save Edits: saves changes without approving or charging"),
      bullet("Print Order Label"),
      bullet("Assign Driver dropdown"),
      spacer(),
      h3("Approval Email to Customer"),
      bullet("Order number, final items and total, delivery date and area"),
      bullet("Smoked Style contact info"),
      bullet("Status updated to Approved"),
      spacer(),
      h3("Rejection Email to Customer"),
      bullet("Order number"),
      bullet("Reason (admin types short reason)"),
      bullet("Contact info"),
      bullet("Invitation to reorder or call"),
      spacer(),

      h2("Screen 8 — Daily Production Report"),
      p("Separate screen — critical for production planning. Shows what needs to be made for any given day."),
      spacer(),
      h3("Layout"),
      bullet("Date selector at top — navigate to any past or future date"),
      bullet("Two sections side by side:"),
      spacer(),
      h3("Section 1 — Confirmed Production (Approved Orders)"),
      bullet("Jerky: flavor by flavor, total lbs needed"),
      bullet("Steaks: cut by cut, total pieces"),
      bullet("Smoked: item by item, total units"),
      bullet("Non-Smoked: item by item, total units"),
      bullet("Boards: type and size, total units"),
      bullet("Print button for this list"),
      spacer(),
      h3("Section 2 — Pending Production (Awaiting Approval)"),
      bullet("Same breakdown as confirmed"),
      bullet("Displayed in different color to distinguish from confirmed"),
      bullet("Print button for this list"),
      spacer(),
      h3("Additional Controls"),
      bullet("Toggle to combine both lists into one print"),
      bullet("Navigate to any date — past or future, no restrictions"),
      spacer(),

      h2("Screen 9 — Inventory Management"),
      h3("Layout"),
      bullet("Tabs: All, Jerky, Steaks, Smoked, Non-Smoked, Boards"),
      spacer(),
      h3("Each Product Shows"),
      bullet("Photo"),
      bullet("Product name"),
      bullet("Current stock level"),
      bullet("In stock / Out of stock toggle — manual override"),
      bullet("Edit stock number directly"),
      bullet("Low stock warning threshold — set individually per product, flags red when below"),
      spacer(),
      h3("Inventory Tracking Rules"),
      bullet("Jerky: tracked per flavor in lbs"),
      bullet("Steaks: tracked per cut in pieces; Skirt Steak tracked in packs of 4"),
      bullet("Boards: tracked per type and size"),
      bullet("All other items: tracked per unit"),
      bullet("Approving an order automatically deducts inventory"),
      bullet("No warning when stock hits zero — red flag only"),
      spacer(),
      h3("Stock History Log"),
      bullet("Every change recorded: what changed, how much, who changed it, timestamp"),
      spacer(),
      h3("Alerts"),
      bullet("Low stock flagged red on inventory screen"),
      bullet("Low stock shown on Orders Dashboard summary bar"),
      bullet("Out of stock automatically reflected on customer catalog"),
      spacer(),

      h2("Screen 10 — Customer Management"),
      h3("Customer List"),
      bullet("Search by name, phone, or email"),
      bullet("Auto-fill from saved customers when typing — no re-entry of info"),
      bullet("Sortable by name, total orders, total spent, last order date"),
      spacer(),
      h3("Each Customer Card"),
      bullet("Name, phone, email"),
      bullet("Total orders, total spent, last order date, member since"),
      bullet("Customer tags: VIP, Wholesale, Event Customer"),
      spacer(),
      h3("Individual Customer Profile"),
      bullet("Full contact info"),
      bullet("Customer tags"),
      bullet("Order history: every order, status, date, total, items"),
      bullet("Total spent lifetime"),
      bullet("Card on file: last 4 digits only"),
      bullet("Delivery addresses used"),
      bullet("Internal admin notes field — e.g. 'Always calls before delivery', 'VIP client'"),
      bullet("Reorder button: create new order on behalf of customer"),
      spacer(),
      h3("Backend Order Entry"),
      bullet("Auto-fills from saved customer profile"),
      bullet("Select items from catalog"),
      bullet("Select delivery or pickup"),
      bullet("Select area: includes Personal Delivery and Uber (backend only)"),
      bullet("Set custom delivery charge"),
      bullet("Set delivery date"),
      bullet("Add notes and gift message"),
      bullet("Use card on file or enter new card"),
      spacer(),

      h2("Screen 11 — Bulk Order Management"),
      p("Backend only — office staff enters bulk orders on behalf of customers. Used for large events, Purim mishloach manos, corporate gifts."),
      spacer(),
      h3("How It Works"),
      bullet("Office downloads Excel template from system"),
      bullet("Customer fills in template and sends to office"),
      bullet("Office uploads completed template"),
      bullet("System auto-populates all stops under one bulk order"),
      bullet("Staff reviews full breakdown before confirming"),
      bullet("One charge for the entire bulk order"),
      bullet("All stops fed automatically into driver route system"),
      spacer(),
      h3("Excel Template Columns"),
      makeTable(
        ["Column", "Description"],
        [
          ["Recipient Name", "Name of the person receiving this stop"],
          ["Phone Number", "Recipient phone number"],
          ["Delivery Address", "Full delivery address"],
          ["Area", "Delivery area (must match area list)"],
          ["Item Name", "Product name from catalog"],
          ["Size / Options", "Board size, steak cut, jerky weight and flavor etc."],
          ["Gift Message", "Optional message for this recipient"],
          ["Special Notes", "Any delivery or preparation notes"],
        ],
        [3000, 6360]
      ),
      spacer(),
      h3("Business Rules"),
      bullet("Each recipient can have a different item and size"),
      bullet("System validates items against catalog on upload — flags unrecognized items"),
      bullet("Up to 50-100 stops per bulk order"),
      bullet("Each stop gets its own label and packing slip"),
      bullet("Out-of-stock items flagged during review before confirming"),
      spacer(),

      h2("Screen 12 — Print Order Label"),
      h3("Label Format — Zebra ZPL"),
      bullet("Smoked Style logo"),
      bullet("Order number"),
      bullet("Customer name and phone"),
      bullet("Delivery address or PICKUP"),
      bullet("Delivery area"),
      bullet("Delivery date"),
      bullet("Items: name, quantity, options"),
      bullet("Gift message"),
      bullet("Special notes"),
      bullet("Driver name if assigned"),
      bullet("QR code: driver scans to mark delivered"),
      bullet("No financials on label"),
      spacer(),
      h3("Packing Slip — Separate Printout"),
      bullet("Smoked Style logo and contact info"),
      bullet("Order number"),
      bullet("Customer name"),
      bullet("Full items detail"),
      bullet("Gift message"),
      bullet("Special notes"),
      bullet("Thank you message"),
      bullet("No financials"),
      spacer(),
      h3("Printing Options"),
      bullet("Single order: print label and/or packing slip"),
      bullet("Bulk print by date: all labels for a delivery date"),
      bullet("Bulk print by route: all labels for a specific area"),
      bullet("Bulk order: one label and packing slip per recipient"),
      new Paragraph({ children: [new PageBreak()] }),

      // PHASE SUMMARY
      h1("Phase Summary"),
      spacer(),
      h2("Phase 1 — This Document"),
      bullet("Customer storefront: catalog, cart, checkout, order confirmation"),
      bullet("Admin backend: order management, approval workflow, inventory, customer management"),
      bullet("Bulk order system"),
      bullet("Daily production report"),
      bullet("Print labels and packing slips (Zebra ZPL)"),
      bullet("Push notifications for new orders and deliveries"),
      spacer(),
      h2("Phase 2 — Driver System"),
      bullet("Dedicated driver app (Android)"),
      bullet("Auto-optimized route planning with Google Maps"),
      bullet("Stop counter (e.g. 10/15)"),
      bullet("Proof of delivery photo with timestamp"),
      bullet("QR code scan to mark delivered"),
      bullet("Delivered history viewable by driver"),
      spacer(),
      h2("Phase 3 — Production Dashboard"),
      bullet("Full production and sales reporting"),
      bullet("Weekly and monthly reports"),
      bullet("Ingredient totals for production"),
      bullet("Daily delivery totals by item"),
      spacer(),
      h2("Phase 4 — Android Staff App"),
      bullet("Enter orders from phone (phone orders)"),
      bullet("Customer auto-fill from saved profiles"),
      bullet("Card on file support"),
      bullet("View production reports"),
      spacer(),

      // CONTACT
      h1("Business Contact Info"),
      makeTable(
        ["Field", "Details"],
        [
          ["Business Name", "Smoked Style"],
          ["Phone / WhatsApp", "(718) 810-9472"],
          ["Email", "Smokedstyle1@gmail.com"],
        ],
        [3120, 6240]
      ),
    ]
  }]
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath =
    process.env.SMOKED_DOCX_OUTPUT ||
    path.join(__dirname, 'SmokedStyle_Phase1_Spec.docx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);
  console.log('Done — wrote', outPath);
});
