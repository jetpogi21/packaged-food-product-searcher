import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";

test("searches Open Food Facts through the application backend", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("What are you looking for?").fill("oat milk");

  const productResponse = page.waitForResponse((response) =>
    response.url().startsWith(`${apiBaseUrl}/products?query=oat%20milk`)
  );
  await page.getByRole("button", { name: "Search index" }).click();

  await expect((await productResponse).status()).toBe(200);
  await expect(page.getByLabel("Product results").getByRole("listitem").first()).toBeVisible();
  await expect(page.getByText(/products found for "oat milk"/)).toBeVisible();
  await page.locator(".image-frame img").first().evaluate((image) => new Promise<void>((resolve) => {
    if (image.complete) resolve();
    else image.addEventListener("load", () => resolve(), { once: true });
  }));
  await page.screenshot({ path: testInfo.outputPath("product-search.png"), fullPage: true });
});

test("explains empty and unavailable searches", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search index" }).click();
  await expect(page.locator(".notice.error")).toHaveText("Enter a food, brand, or product name to start your search.");

  await page.route(`${apiBaseUrl}/products?query=broken&locale=en`, async (route) => {
    await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Product search is temporarily unavailable. Please try again." }) });
  });
  await page.getByLabel("What are you looking for?").fill("broken");
  await page.getByRole("button", { name: "Search index" }).click();
  await expect(page.locator(".notice.error")).toHaveText("Product search is temporarily unavailable. Please try again.");
});
