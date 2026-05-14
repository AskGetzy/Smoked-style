module.exports = `Deploy the Smoked Style app to Vercel for production.

STACK: Next.js 14 App Router, Supabase, Stripe.

STEP 1 — PRE-DEPLOY BUILD CHECK:
Run: npm run build
Fix any TypeScript errors or build failures before continuing.
Common issues:
- Missing type definitions: add them
- Unused imports: remove them
- Missing env vars in code: make sure all process.env references match the .env.local keys

STEP 2 — PUSH TO GITHUB:
1. Go to github.com and create a new private repository called smoked-style
2. In your project folder, run:
   git init
   git add .
   git commit -m "Initial commit — Smoked Style Phase 1"
   git remote add origin https://github.com/YOUR_USERNAME/smoked-style.git
   git push -u origin main

STEP 3 — CONNECT TO VERCEL:
1. Go to vercel.com and sign in
2. Click "Add New Project"
3. Import your smoked-style GitHub repository
4. Framework preset: Next.js (auto-detected)
5. Root directory: leave as default
6. Do NOT click Deploy yet — add environment variables first

STEP 4 — ADD ENVIRONMENT VARIABLES IN VERCEL:
In the Vercel project settings, add ALL of the following variables exactly as they appear in your .env.local file:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_GOOGLE_MAPS_KEY
Add them for all three environments: Production, Preview, and Development.
Now click Deploy.

STEP 5 — UPDATE SUPABASE FOR PRODUCTION:
1. Go to your Supabase project → Authentication → URL Configuration
2. Add your Vercel production URL to Site URL: https://your-app.vercel.app
3. Add to Redirect URLs: https://your-app.vercel.app/auth/callback
4. If you have a custom domain, add that too

STEP 6 — UPDATE STRIPE WEBHOOK:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add a new endpoint: https://your-app.vercel.app/api/webhooks/stripe
3. Select these events: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled
4. Copy the new webhook signing secret and update STRIPE_WEBHOOK_SECRET in Vercel environment variables
5. Redeploy for the new secret to take effect

STEP 7 — UPDATE GOOGLE OAUTH:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add to Authorized JavaScript origins: https://your-app.vercel.app
4. Add to Authorized redirect URIs: https://your-app.vercel.app/auth/callback
5. Save

STEP 8 — END-TO-END PRODUCTION TEST:
1. Open your production URL
2. Sign in with Google — confirm it works
3. Add items to cart and place a test order
4. Confirm the order appears in Supabase orders table with status 'pending'
5. Confirm Stripe shows the payment intent as 'requires_capture'
6. Go to /admin and approve the order
7. Confirm Stripe shows the payment captured
8. Confirm the customer receives an approval email
9. Test the production report and inventory deduction

PRE-LAUNCH CHECKLIST:
- Google Sign-In works on production domain
- Orders create correctly in Supabase
- Stripe authorize/capture flow works end to end
- Admin login works (email/password)
- Admin routes redirect to login when logged out
- Push notifications fire on new order
- Confirmation email sends
- Approval email sends
- ZPL label downloads
- Inventory deducts on order approval
- Mobile layout looks correct on phone`;
