module.exports =
  "Build the main catalog page at app/page.tsx for Smoked Style, a premium smoked meats business.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase.\n\n" +
  "LAYOUT:\n" +
  "- Header at top: business name 'Smoked Style', cart icon showing item count and running total, Google Sign In button (show Sign Out if already logged in)\n" +
  "- Below header: Purim Special section — only visible when any product has is_featured_purim = true in the database. Show a warm seasonal banner with those products.\n" +
  "- Best Sellers section — show the top 6 most ordered products (query order_items, count by product_id, sort desc)\n" +
  "- Category tabs: Jerky | Steaks | Smoked | Non-Smoked | Boards. Clicking a tab filters the products below.\n" +
  "- Product grid: 3 columns on desktop, 2 on tablet, 1 on mobile. Each card shows placeholder image, product name, short description, price, and an Add to Cart button.\n" +
  "- Out of stock products: grey out the card, show 'Out of Stock' badge, hide Add to Cart button.\n\n" +
  "PRODUCT INTERACTIONS (show a modal or slide-in panel):\n" +
  "- Jerky: let user pick flavor (dropdown from flavors array) and weight (dropdown of weight_options array, showing price next to each: 0.5 lb - $50, 1 lb - $100, etc). Price updates live as they select.\n" +
  "- Steaks: let user pick quantity (number input, min 1). For Skirt Steak, label it as 'packs of 4' and show price per pack.\n" +
  "- Boards: if a product has multiple size variants (same subcategory, different size_label), let user pick the size. Show each size and price.\n" +
  "- Smoked and Non-Smoked: let user pick quantity (number input, min 1).\n\n" +
  "SIGN IN RULE:\n" +
  "- If user clicks Add to Cart and is NOT signed in, show Google Sign In modal first.\n" +
  "- After sign in, add item to cart automatically.\n" +
  "- Use Supabase Auth with Google OAuth provider.\n\n" +
  "CART STATE:\n" +
  "- Store cart in localStorage and sync to a carts table in Supabase when user is signed in.\n" +
  "- Cart persists across sessions.\n\n" +
  "PRICING DISPLAY:\n" +
  "- All prices visible to everyone, no sign-in required to see prices.\n\n" +
  "Fetch products from Supabase products table. Use placeholder grey images for now. Make the design clean, modern and appetizing — dark background header, warm amber/orange accents.";
