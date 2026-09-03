import { expect, test } from "@playwright/test";
import Stripe from "stripe";
import { checkoutInputFromUser } from "../apps/api/src/stripe";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";

test("maps the demo user identity into a Checkout Session input", () => {
  expect(checkoutInputFromUser({ id: "demo-user", email: "demo@example.com" }, "de")).toEqual({
    userId: "demo-user",
    email: "demo@example.com",
    locale: "de"
  });
});

test("activates the demo entitlement from the associated Checkout completion", async ({ request }) => {
  const event = {
    id: "evt_checkout_association",
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "demo-user",
        customer: "cus_checkout_association",
        customer_email: "demo@pantry-index.test",
        subscription: "sub_checkout_association"
      }
    }
  };
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_payments_test_secret" });

  const webhook = await request.post(`${apiBaseUrl}/stripe/webhook`, {
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    data: payload
  });
  expect(webhook.status()).toBe(200);
  expect(await webhook.json()).toEqual({ received: true, duplicate: false });

  const entitlement = await request.get(`${apiBaseUrl}/entitlement`);
  expect(entitlement.status()).toBe(200);
  expect(await entitlement.json()).toEqual(expect.objectContaining({
    active: true,
    status: "active",
    stripeCustomerId: "cus_mock_checkout",
    stripeSubscriptionId: "sub_checkout_association"
  }));
});
