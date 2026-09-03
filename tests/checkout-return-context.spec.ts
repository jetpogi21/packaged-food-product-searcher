import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3001";

test("restores the selected product after pending and cancelled Checkout returns", async ({ page }, testInfo) => {
  await page.route(`${apiBaseUrl}/recent-searches`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ searches: [] }) }));
  await page.route(`${apiBaseUrl}/entitlement`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "inactive", active: false }) }));
  await page.route(`${apiBaseUrl}/products?query=oat%20milk&locale=en`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ locale: "en", products: [{ id: "123", name: "Oat Milk", brand: "Test Pantry", imageUrl: null }] }) }));

  await page.goto("/");
  await page.getByLabel("What are you looking for?").fill("oat milk");
  await page.getByRole("button", { name: "Search index" }).click();

  const productCard = page.locator(".product-card").first();
  await productCard.getByRole("button", { name: "Nutrition details" }).click();
  await productCard.getByRole("button", { name: "Continue to monthly plan" }).click();
  await expect(page).toHaveURL("/?checkout=pending");

  await expect(page.getByLabel("What are you looking for?")).toHaveValue("oat milk");
  await expect(productCard.getByText("Oat Milk")).toBeVisible();
  await expect(productCard.getByLabel("Nutrition subscription confirmation")).toContainText("Your payment is being confirmed.");
  await expect(productCard.getByRole("button", { name: "Continue to monthly plan" })).toHaveCount(0);

  await page.goto("/?checkout=cancelled");
  await expect(page.getByLabel("What are you looking for?")).toHaveValue("oat milk");
  await expect(productCard.getByText("Oat Milk")).toBeVisible();
  await expect(productCard.getByText("Checkout was cancelled. Nutrition details remain locked.")).toBeVisible();
  await expect(productCard.getByRole("button", { name: "Continue to monthly plan" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("checkout-return-context.png"), fullPage: true });
});
