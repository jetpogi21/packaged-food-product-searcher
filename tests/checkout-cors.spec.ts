import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";
const webBaseUrl = process.env.PLAYWRIGHT_WEB_BASE_URL ?? "http://127.0.0.1:3100";

test("allows the browser to send the localized Checkout request", async ({ page, request }) => {
  const preflight = await request.fetch(`${apiBaseUrl}/billing/checkout`, {
    method: "OPTIONS",
    headers: {
      Origin: webBaseUrl,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type"
    }
  });

  expect(preflight.status()).toBe(204);
  expect(preflight.headers()["access-control-allow-origin"]).toBe("*");
  expect(preflight.headers()["access-control-allow-methods"]).toContain("POST");
  expect(preflight.headers()["access-control-allow-headers"]).toContain("Content-Type");

  const checkout = await page.evaluate(async (url) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: "de" })
    });
    return { status: response.status, payload: await response.json() };
  }, `${apiBaseUrl}/billing/checkout`);

  expect(checkout.status).toBe(200);
  expect(checkout.payload).toEqual(expect.objectContaining({ locale: "de", url: expect.any(String) }));
});
