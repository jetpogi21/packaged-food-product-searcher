# Pantry Index

Pantry Index is a full-stack packaged-food product finder built for the assignment brief. It searches Open Food Facts through a TypeScript Express API, stores a demo user's recent searches in MySQL through Prisma, provides English, Dutch, German, and French interfaces, and gates nutrition details behind a Stripe test-mode monthly subscription.

## Local setup

### Prerequisites

- Node.js 20 or later and npm
- MySQL 8 or later running locally
- A Stripe test-mode account and recurring monthly Price for the real Checkout flow
- The Stripe CLI only when manually exercising real webhook delivery

Install the workspace dependencies, create a local environment file, then set the MySQL password and Stripe test values:

```powershell
npm ci
Copy-Item .env.example .env
```

Create the database named in `DATABASE_URL`, then generate Prisma's client and apply the included migrations:

```powershell
npx prisma generate
npx prisma migrate deploy
```

Start the API and web app in separate terminals:

```powershell
npm run dev:api
npm run dev:web
```

Open http://127.0.0.1:3000. The browser uses the API at http://127.0.0.1:3001 by default. Set `NEXT_PUBLIC_API_BASE_URL` in `.env` only when the API uses a different public base URL.

## Environment

`.env.example` contains safe placeholders only. Keep the filled-in `.env` file local and out of Git.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma's MySQL connection string. |
| `APP_URL` | Browser origin used for Checkout return URLs and CORS. |
| `STRIPE_SECRET_KEY` | Stripe test-mode secret key. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret printed by `stripe listen`. |
| `STRIPE_PRICE_ID` | Stripe recurring monthly Price ID. |
| `SEARCH_HISTORY_STORE` / `PAYMENTS_STORE` | Use `prisma` for the assignment's MySQL-backed local run. |
| `PAYMENTS_PROVIDER` / `NUTRITION_PROVIDER` | Use `stripe` and `openfoodfacts` for the real integrations; focused tests use mock values. |

## Internationalization

The language selector supports English (`en`), Dutch (`nl`), German (`de`), and French (`fr`). The selected locale drives interface copy and is passed to the backend. The backend prefers a matching Open Food Facts localized product-name field, falling back to the product's default name when that field is unavailable. Product source data is therefore localized when Open Food Facts provides it, not artificially translated.

## Stripe test flow

Set a Stripe test secret key and a monthly recurring Price ID in `.env`, then restart the API. To deliver webhook events to the local API, run this in another terminal and copy its signing secret into `STRIPE_WEBHOOK_SECRET` before restarting the API:

```powershell
stripe listen --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted --forward-to http://127.0.0.1:3001/stripe/webhook
```

From a product card, choose the monthly plan and complete Stripe's hosted Checkout with a Stripe test card, such as `4242 4242 4242 4242`, any future expiry date, any CVC, and any postal code. Stripe redirects back to the selected product. The app shows a pending confirmation state until the webhook records an active entitlement; nutrition details then unlock. Subscription updates and deletions are processed server-side, so the browser cannot grant access by itself.

## Focused verification commands

Each feature has a dedicated Playwright scenario rather than relying on one broad end-to-end suite:

The test commands start an isolated browser/API pair on ports 3100 and 3101 by default, so a local development server on ports 3000 and 3001 cannot affect their results. Override those defaults only with `PLAYWRIGHT_WEB_PORT` and `PLAYWRIGHT_API_PORT` when required.

```powershell
npm run test:server-isolation
npm run test:product-search
npm run test:recent-searches
npm run test:localization
npm run test:checkout-entitlement
npm run test:checkout-return-context
npm run test:search-first-localized-checkout
npm run test:checkout-cors
npm run test:checkout-association
```

To check the required handoff artifacts without starting the application, run:

```powershell
npm run verify:submission
```

## Technical decisions

- The web client is TypeScript with Next.js and React. Tailwind v4 is loaded for the app, while the distinctive editorial visual system is maintained in a small global CSS layer instead of a generic component kit.
- The Express API owns Open Food Facts requests, normalization, Stripe session creation, webhook validation, and nutrition authorization. This keeps external secrets and entitlement logic out of the browser.
- Prisma targets MySQL for the required demo user, recent search history, entitlement records, and idempotent Stripe webhook-event records. Two committed migrations create those tables.
- The app uses one seeded demo identity because the brief requires a single demo user, not a full authentication system.
- Stripe Checkout is hosted by Stripe. The return URL improves continuity, but the signed webhook is authoritative for nutrition access.

## Known limitations

- Open Food Facts is a third-party catalogue: search availability, images, nutrition fields, and localized names depend on its upstream data.
- This is an assignment demonstration with one demo identity; it does not include account registration, sign-in, self-service billing management, or production operations.
- A local real-Stripe test requires an active Stripe CLI listener. When the listener is stopped, Checkout can still finish at Stripe but the local app will not receive new webhook events until forwarding resumes.
- The included tests use focused local scenarios and controlled integration substitutes where appropriate. They do not replace a production monitoring or resilience program.

## No deployment

Deployment is intentionally not included. The assignment asks for a Git repository with source code, Prisma migration, `.env.example`, tests, and a README; it does not require a hosted environment. The repository is prepared to run locally with MySQL and Stripe test mode.

## Submission checklist

- Source code for the Next.js/React client and TypeScript Express API
- Prisma schema plus MySQL migrations
- Safe `.env.example` template
- Dedicated Playwright scenarios and commands for the implemented features
- This README with local setup, technical decisions, internationalization behavior, limitations, and Stripe test instructions
