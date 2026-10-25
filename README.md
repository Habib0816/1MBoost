# 1MBoost AI Professional — Starter Project

This is a professional **starter codebase**, not a deployed or production-certified service.

## Included
- Next.js App Router + TypeScript starter
- Server-side AI content generation endpoint (OpenAI-compatible API)
- Server-side Paystack transaction initialization and verification endpoints
- Supabase client helpers and example database schema / row-level security policies
- Dashboard starter UI
- Environment-variable template and setup guide

## Not included yet
- Live social account OAuth connections or scheduled posting
- Production-ready complete authentication screens / role management
- Live payment credentials, verified webhooks, deployment, app-store builds, or legal/compliance review
- A guarantee of followers, views, or revenue

## Requirements
- Node.js 20+
- A Supabase project
- Paystack test account
- An AI API key for the provider you choose

## Setup
1. Install Node.js on a computer or use a cloud development environment.
2. Extract this ZIP.
3. Copy `.env.example` to `.env.local` and fill in values.
4. Install dependencies: `npm install`
5. Start locally: `npm run dev`
6. Open `http://localhost:3000`

## Security notes
- Never commit `.env.local` or publish secret API keys.
- Keep Paystack secret keys and AI keys server-side only.
- Before production, implement authenticated ownership checks on every user-specific endpoint, webhook signature validation, rate limiting, abuse monitoring, backups, and security review.
- The included billing routes are a starting point. Do not accept real payments until you have tested Paystack's test mode and completed the missing production controls.

## Paystack flow
1. Client requests `POST /api/payments/initialize` with email and plan code.
2. Server calls Paystack using `PAYSTACK_SECRET_KEY`.
3. Client redirects the user to Paystack's `authorization_url`.
4. After payment, verify using `GET /api/payments/verify?reference=...`.
5. For production, add a Paystack webhook with signature validation and update subscription status idempotently. Never trust a browser redirect alone as proof of payment.

## AI flow
`POST /api/ai/content` accepts `{ topic, platform, tone }`. The endpoint uses `AI_API_KEY` and `AI_MODEL`. Configure the endpoint to match your selected provider's API format.

## Next build stages
1. Add Supabase Auth UI and protect dashboard routes.
2. Add Paystack webhook + subscription lifecycle.
3. Add approved OAuth flows for Facebook/Instagram, X, and YouTube; permissions and API availability vary by platform.
4. Add content scheduling with a queue/worker.
5. Add automated tests, rate limits, logs, backups, and security review.

## Stage 2 (added)
- Supabase email/password auth (`/login`), middleware protecting `/dashboard` and `/payment/*`
- AI, drafts and payment-initialize endpoints now require a signed-in user
- `/api/drafts` (save/list) with RLS, "Save draft" button in the dashboard
- `/payment/callback` page and `/api/payments/webhook` (HMAC-SHA512 signature check, amount check, idempotent plan activation)
- Run the new section at the bottom of `supabase/schema.sql`, then set the Paystack webhook URL to `https://YOUR-DOMAIN/api/payments/webhook`
- Not yet tested against live services (no network in this build environment): run `npm install && npm run build` and test with Paystack test keys.

## Access model
Register (free) to see everything. Payment is only for a Boost (Starter / Professional) from the dashboard; plan is activated by the verified Paystack webhook.

## Android / iPhone / Computer
The app is a PWA (installable web app). Deploy it over HTTPS (e.g. Vercel), then:
- **Android (Chrome):** open the site, tap "Install app" (or menu > Install app).
- **iPhone (Safari):** Share > Add to Home Screen.
- **Computer (Chrome/Edge):** click the install icon in the address bar or the "Install app" button.
Play Store / App Store versions need a native wrapper (e.g. Capacitor) and developer accounts; not included.

## Stage 5
`/dashboard/planner` (posting calendar) and `/dashboard/campaigns` (ad goal/budget plan). Run the "Stage 5" SQL at the bottom of `supabase/schema.sql`. Ads themselves are bought in each platform's official Ads Manager; the app promises no guaranteed numbers.

## Stage 6: auto posting plan
- `/dashboard/planner` > "Plan my posts for me": picks topic, platform, posts/day and days; the app fills the calendar (07:00 to 21:00 Nigeria time, rotating post angles).
- Free: first 30 days, up to 3 posts/day. Starter: up to 6/day. Professional: up to 10/day. Each Boost lasts 30 days from payment, then the user pays again (`profiles.plan_expires_at`, set by the webhook).
- Run the "Stage 6" SQL at the bottom of `supabase/schema.sql`. Limits live in `src/lib/plan.ts`.

## Stage 7
`/dashboard/accounts`: users save public profile links only (https, platform domain checked in `src/lib/social.ts`). The app never asks for or stores usernames/passwords. Run the "Stage 7" SQL. Links are not ownership-verified; use official OAuth later if needed.

## Stage 8
Auto-plan shows the user's saved profile link for the chosen platform (or a prompt to add one).
