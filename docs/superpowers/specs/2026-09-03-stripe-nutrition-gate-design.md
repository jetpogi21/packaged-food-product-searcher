# Stripe nutrition gate design

## Approved scope

The existing demo user can browse product names, brands, and images without payment. Each product card offers a nutrition-details action. An inactive user sees a monthly subscription gate; an entitled user can request nutrition data for that product.

Checkout uses Stripe-hosted Checkout in `subscription` mode. The browser only receives the Checkout URL. Stripe secrets and entitlement decisions stay in Express.

The Checkout return page is explicitly non-authoritative. It reports that payment is being confirmed; only a signed Stripe webhook can update the MySQL entitlement. The nutrition API checks that entitlement for every request.

## Data model

`SubscriptionEntitlement` belongs one-to-one to `User` and stores Stripe customer and subscription identifiers, Stripe status, the current period end, and update time. `StripeWebhookEvent` stores each processed Stripe event ID so webhook redelivery is idempotent.

`active` and `trialing` are treated as entitled. All other statuses remain gated.

## Backend flow

1. `POST /billing/checkout` resolves the single demo user and creates a Stripe Checkout Session with the configured recurring `STRIPE_PRICE_ID`, `client_reference_id`, and subscription metadata containing the internal user ID.
2. `POST /stripe/webhook` uses the raw request body and `STRIPE_WEBHOOK_SECRET` to verify the Stripe signature before parsing the event.
3. `checkout.session.completed` links the customer and subscription to the demo user but does not itself make access active.
4. `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` upsert the entitlement status. Duplicate event IDs do no work.
5. `GET /products/:productId/nutrition` checks the entitlement, then requests only nutrition fields from Open Food Facts. A non-entitled user receives a stable 403 response and no nutrition payload.

## Configuration and safety

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, and `APP_URL` stay in ignored local environment configuration. Missing configuration fails closed with a safe 503 response. A test-only mock Checkout provider is enabled only by an explicit test environment variable; production defaults never grant access or create fake entitlements.

## UI states

- Nutrition action: public card affordance.
- Loading: selected card shows nutrition request in progress.
- Inactive: subscription gate with monthly Checkout action.
- Checkout return: pending confirmation; no entitlement change in the browser.
- Entitled: nutrition facts appear in the selected card.
- Configuration/network failure: concise error that preserves public product browsing.

## Non-goals

- User authentication, multiple users, self-service billing portal, tax handling, and production deployment.
- A real Stripe Checkout transaction before test credentials exist.

## Verification boundary

Focused coverage verifies the product-card gate, test-only Checkout redirect, signed webhook handling, duplicate-event safety, backend nutrition enforcement, and missing-configuration denial. A real Stripe test Checkout and dashboard-delivered webhook remain explicitly unverified until test credentials are supplied.
