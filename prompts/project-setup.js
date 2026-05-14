module.exports =
  "Create a new Next.js 14 project using the App Router. Set up the following:\n\n" +
  "1. Install and configure Tailwind CSS\n" +
  "2. Install Supabase client: npm install @supabase/supabase-js @supabase/auth-helpers-nextjs\n" +
  "3. Install Stripe: npm install stripe @stripe/stripe-js @stripe/react-stripe-js\n" +
  "4. Create a .env.local file with placeholders for: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_GOOGLE_MAPS_KEY\n" +
  "5. Create a Supabase client utility at lib/supabase.ts\n" +
  "6. Create a Stripe utility at lib/stripe.ts\n" +
  "7. Set up the basic folder structure:\n" +
  "   app/ (pages)\n" +
  "   app/admin/ (admin backend pages)\n" +
  "   components/ (reusable UI components)\n" +
  "   lib/ (utilities)\n" +
  "   types/ (TypeScript types)\n\n" +
  "Do not build any UI yet. Just set up the project structure and dependencies.";
