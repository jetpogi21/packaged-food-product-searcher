import { expect, test } from "@playwright/test";
import Stripe from "stripe";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";
const webhookSecret = "whsec_payments_test_secret";

test("activates the matching entitlement from a signed Checkout completion without a client reference", async ({ request }) => {
  const stripe = new Stripe("sk_test_checkout_entitlement_spec");
  const event = {
    id: "evt_checkout_entitlement_active",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_checkout_entitlement_spec",
        object: "checkout.session",
        client_reference_id: null,
        customer_email: "demo@pantry-index.local",
        customer: "cus_checkout_entitlement_spec",
        subscription: "sub_checkout_entitlement_spec"
      }
    }
  };
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

  const response = await request.post(`${apiBaseUrl}/stripe/webhook`, {
    data: payload,
    headers: { "content-type": "application/json", "stripe-signature": signature }
  });

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ received: true, duplicate: false });

  const entitlement = await request.get(`${apiBaseUrl}/entitlement`);
  await expect(entitlement.json()).resolves.toEqual({
    status: "active",
    active: true,
    stripeCustomerId: "cus_mock_checkout",
    stripeSubscriptionId: "sub_checkout_entitlement_spec",
    currentPeriodEnd: null
  });
});
