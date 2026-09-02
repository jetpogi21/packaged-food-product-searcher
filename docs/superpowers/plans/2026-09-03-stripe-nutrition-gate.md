# Stripe nutrition gate implementation plan

1. Update `prisma/schema.prisma` and add a dedicated migration for the demo-user entitlement and idempotent Stripe event records. Regenerate Prisma Client. Verify with `prisma migrate deploy` against the existing local MySQL database.
2. Add `apps/api/src/entitlements.ts` to centralize demo-user lookup, status evaluation, and test-only memory storage. Add `apps/api/src/stripe.ts` to isolate Checkout Session creation and webhook construction from Express handlers.
3. Extend `apps/api/src/index.ts` with raw-body webhook handling before ordinary routes, safe Checkout creation, entitlement status, and protected Open Food Facts nutrition lookup. Validate product IDs and fail closed on missing Stripe configuration.
4. Extend `apps/web/src/app/product-search.tsx` and `apps/web/src/app/globals.css` with per-card nutrition actions, the inactive subscription gate, pending Checkout return state, and entitled nutrition display.
5. Add `tests/payments.spec.ts` and `npm run test:payments`. The spec will exercise browser UI with the test-only Checkout provider and use a signed Stripe webhook fixture to prove server-side access changes.
6. Run only `npm run test:payments`, inspect its screenshot, apply the migration to local MySQL, verify the entitlement/event rows and protected nutrition response through the real API/data boundary, then record contract evidence and commit the slice.
