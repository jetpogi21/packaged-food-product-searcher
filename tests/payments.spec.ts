import { expect, test } from "@playwright/test";
import Stripe from "stripe";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";
const webhookSecret = "whsec_payments_test_secret";

test("keeps nutrition locked until a verified subscription webhook activates access", async ({ page, request }, testInfo) => {
  await page.route(`${apiBaseUrl}/recent-searches`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ searches: [] }) }));
  await page.route(`${apiBaseUrl}/products?query=oat%20milk&locale=en`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ locale: "en", products: [{ id: "123", name: "Oat Milk", brand: "Test Pantry", imageUrl: null }] }) }));

  await page.goto("/");
  await page.getByLabel("What are you looking for?").fill("oat milk");
  await page.getByRole("button", { name: "Search index" }).click();
  await page.getByRole("button", { name: "Nutrition details" }).click();

  const gate = page.getByLabel("Nutrition subscription gate");
  await expect(gate).toContainText("Nutrition details are available with the monthly plan.");
  await page.screenshot({ path: testInfo.outputPath("nutrition-gate.png"), fullPage: true });

  await page.getByRole("button", { name: "Continue to monthly plan" }).click();
  await page.waitForURL("**/?checkout=pending");
  await expect(page.getByRole("status")).toContainText("Your payment is being confirmed.");
  await page.screenshot({ path: testInfo.outputPath("checkout-pending.png"), fullPage: true });

  const beforeWebhook = await request.get(`${apiBaseUrl}/products/123/nutrition`);
  expect(beforeWebhook.status()).toBe(403);

  const stripe = new Stripe("sk_test_payment_spec");
  const event = {
    id: "evt_payment_spec_active",
    object: "event",
    type: "customer.subscription.updated",
    data: { object: { id: "sub_payment_spec", object: "subscription", customer: "cus_payment_spec", status: "active", current_period_end: 1_800_000_000, metadata: { demoUserId: "demo-user" } } }
  };
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const webhookResponse = await request.post(`${apiBaseUrl}/stripe/webhook`, { data: payload, headers: { "content-type": "application/json", "stripe-signature": signature } });
  expect(webhookResponse.status()).toBe(200);
  await expect(await webhookResponse.json()).toEqual({ received: true, duplicate: false });

  const duplicateResponse = await request.post(`${apiBaseUrl}/stripe/webhook`, { data: payload, headers: { "content-type": "application/json", "stripe-signature": signature } });
  await expect(await duplicateResponse.json()).toEqual({ received: true, duplicate: true });

  const afterWebhook = await request.get(`${apiBaseUrl}/products/123/nutrition`);
  expect(afterWebhook.status()).toBe(200);
  await expect((await afterWebhook.json()).nutrition).toEqual(expect.objectContaining({ energyKcalPer100g: 47, proteinPer100g: 3.4 }));

  await page.goto("/");
  await page.getByLabel("What are you looking for?").fill("oat milk");
  await page.getByRole("button", { name: "Search index" }).click();
  await page.getByRole("button", { name: "Nutrition details" }).click();
  await expect(page.getByText("47 kcal")).toBeVisible();
  await expect(page.getByText("3.4 g")).toBeVisible();
});
