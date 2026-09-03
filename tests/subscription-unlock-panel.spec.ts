import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3001";

test("shows the monthly-plan action within the selected locked product", async ({ page }, testInfo) => {
  await page.route(`${apiBaseUrl}/recent-searches`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ searches: [] }) }));
  await page.route(`${apiBaseUrl}/entitlement`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "inactive", active: false }) }));
  await page.route(`${apiBaseUrl}/products?query=oat%20milk&locale=en`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ locale: "en", products: [{ id: "123", name: "Oat Milk", brand: "Test Pantry", imageUrl: null }] }) }));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".label-mark")).toHaveCount(0);
  await expect(page.locator(".hero-grid")).toHaveCSS("padding-top", "72px");

  await page.getByLabel("What are you looking for?").fill("oat milk");
  await page.getByRole("button", { name: "Search index" }).click();

  const productCard = page.locator(".product-card").first();
  await productCard.getByRole("button", { name: "Nutrition details" }).click();

  const gate = productCard.getByLabel("Nutrition subscription gate");
  await expect(gate).toBeVisible();
  await expect(gate.getByText("Nutrition details are available with the monthly plan.")).toBeVisible();
  await expect(gate.getByRole("button", { name: "Continue to monthly plan" })).toBeVisible();
  await expect(page.locator(".results > .subscription-gate")).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 720 });
  await expect.poll(async () => Math.round((await productCard.boundingBox())?.width ?? 0)).toBe(278);
  await page.screenshot({ path: testInfo.outputPath("subscription-unlock-panel.png"), fullPage: true });
});
