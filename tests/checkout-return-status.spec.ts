import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";

test("clears the pending Checkout notice when the entitlement is active", async ({ page }, testInfo) => {
  await page.route(`${apiBaseUrl}/recent-searches`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ searches: [] }) }));
  await page.route(`${apiBaseUrl}/entitlement`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "active", active: true }) }));
  await page.route(`${apiBaseUrl}/products?query=oat%20milk&locale=en`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ locale: "en", products: [{ id: "123", name: "Oat Milk", brand: "Test Pantry", imageUrl: null }] }) }));
  await page.route(`${apiBaseUrl}/products/123/nutrition`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ nutrition: { energyKcalPer100g: 47, fatPer100g: 1.5, saturatedFatPer100g: 0.2, carbohydratesPer100g: 6.7, sugarsPer100g: 4.1, proteinPer100g: 3.4, saltPer100g: 0.12 } }) }));

  await page.goto("/?checkout=pending");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page).toHaveURL("/");

  await page.getByLabel("What are you looking for?").fill("oat milk");
  await page.getByRole("button", { name: "Search index" }).click();
  await page.getByRole("button", { name: "Nutrition details" }).click();
  await expect(page.getByText("47 kcal")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("checkout-return-confirmed.png"), fullPage: true });
});
