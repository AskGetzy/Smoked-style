module.exports =
  "Add print label functionality to the single order page for Smoked Style.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS.\n\n" +
  "This functionality is triggered from the Print Label and Print Packing Slip buttons on the single order page.\n\n" +
  "ZEBRA LABEL (ZPL format):\n" +
  "Create a utility function at lib/zpl.ts that takes an order object and returns a ZPL string.\n\n" +
  "The ZPL label must include:\n" +
  "- 'SMOKED STYLE' in large bold text at top\n" +
  "- Order number\n" +
  "- Customer name\n" +
  "- Phone number\n" +
  "- Delivery address (or 'PICKUP' if pickup order)\n" +
  "- Delivery area\n" +
  "- Delivery date formatted as e.g. 'Tuesday, March 12'\n" +
  "- Items list: each item on its own line with quantity and options\n" +
  "- Gift message (if present): label it 'GIFT: [message]'\n" +
  "- Special notes (if present)\n" +
  "- Driver name (if assigned)\n" +
  "- QR code: use ZPL BQ command to generate QR code linking to the order URL\n" +
  "- NO prices or financial information\n\n" +
  "ZPL PRINT BUTTONS:\n" +
  "- 'Download ZPL' button: downloads the ZPL string as a .zpl file\n" +
  "- 'Send to Printer' button: sends ZPL directly to the Zebra printer via browser (use window.location with zpl:// protocol or provide instructions for Zebra Browser Print)\n\n" +
  "BULK PRINT:\n" +
  "- On the orders dashboard, add a 'Bulk Print Labels' button in the top actions bar\n" +
  "- Let admin select a date and/or delivery area\n" +
  "- Generate one ZPL file containing all labels for those orders\n" +
  "- Download as a single .zpl file\n\n" +
  "PACKING SLIP (HTML print):\n" +
  "Create a utility at lib/packingSlip.ts that generates an HTML string for packing slips.\n\n" +
  "The packing slip includes:\n" +
  "- 'SMOKED STYLE' header with contact info: (718) 810-9472 | Smokedstyle1@gmail.com\n" +
  "- Order number\n" +
  "- Customer name\n" +
  "- Full items list with quantities and options (no prices)\n" +
  "- Gift message (if present)\n" +
  "- Special notes (if present)\n" +
  "- Thank you message: 'Thank you for your order! We hope you enjoy every bite.'\n" +
  "- NO prices or financial information\n\n" +
  "Open packing slip in a new tab and trigger window.print() automatically.";
