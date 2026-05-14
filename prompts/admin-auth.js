module.exports =
  "Set up admin authentication for Smoked Style's backend at app/admin/.\n\n" +
  "STACK: Next.js 14 App Router, Tailwind CSS, Supabase.\n\n" +
  "REQUIREMENTS:\n" +
  "1. Create app/admin/login/page.tsx — a clean login page with:\n" +
  "   - Smoked Style logo/name\n" +
  "   - Email input\n" +
  "   - Password input\n" +
  "   - Sign In button\n" +
  "   - Forgot Password link\n" +
  "   - Lock out after 5 failed attempts (track in state, show countdown)\n" +
  "   - No self-registration option\n\n" +
  "2. Create a middleware at middleware.ts that:\n" +
  "   - Protects all routes under /admin/* (redirect to /admin/login if not authenticated)\n" +
  "   - Does NOT protect customer routes\n" +
  "   - Checks that the logged-in user exists in the admin_users table\n\n" +
  "3. Create an admin layout at app/admin/layout.tsx with:\n" +
  "   - Left sidebar navigation with links: Orders, Production Report, Inventory, Customers, Settings\n" +
  "   - Show logged-in admin name and role\n" +
  "   - Sign Out button\n" +
  "   - Mobile-responsive (hamburger menu on mobile)\n\n" +
  "4. Admin users are created directly in Supabase — there is no sign-up flow. Insert the first admin user manually.\n\n" +
  "Use Supabase Auth for admin login (separate from customer Google Auth). Admin sessions expire after 8 hours of inactivity.";
