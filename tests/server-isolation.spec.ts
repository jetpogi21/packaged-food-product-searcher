import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";
const webBaseUrl = process.env.PLAYWRIGHT_WEB_BASE_URL ?? "http://127.0.0.1:3100";

test("runs the browser and API test servers away from the development ports", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(`${webBaseUrl}/`);

  const entitlement = await request.get(`${apiBaseUrl}/entitlement`);
  expect(entitlement.status()).toBe(200);
  await expect(entitlement.json()).resolves.toEqual(expect.objectContaining({ active: false, status: "inactive" }));
});
