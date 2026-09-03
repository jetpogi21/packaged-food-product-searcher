import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";
const webBaseUrl = process.env.PLAYWRIGHT_WEB_BASE_URL ?? "http://127.0.0.1:3100";

test("starts with search and carries the selected language into Checkout", async ({ page, request }, testInfo) => {
  const checkoutResponse = await request.post(`${apiBaseUrl}/billing/checkout`, { data: { locale: "de" } });
  expect(checkoutResponse.ok()).toBe(true);
  expect(await checkoutResponse.json()).toEqual(expect.objectContaining({ locale: "de" }));

  await page.route(`${apiBaseUrl}/recent-searches`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ searches: [] }) }));
  await page.route(`${apiBaseUrl}/entitlement`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "inactive", active: false }) }));
  await page.route(`${apiBaseUrl}/products?query=hafermilch&locale=de`, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ locale: "de", products: [{ id: "123", name: "Hafermilch", brand: "Test Pantry", imageUrl: null }] }) }));
  await page.route(`${apiBaseUrl}/billing/checkout`, async (route) => {
    expect(JSON.parse(route.request().postData() ?? "{}")).toEqual({ locale: "de" });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ url: `${webBaseUrl}/?checkout=pending`, locale: "de" }) });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect(page.locator(".masthead + .search-form")).toBeVisible();

  await page.getByLabel("Display language").selectOption("de");
  await page.getByLabel("Wonach suchst du?").fill("hafermilch");
  await page.getByRole("button", { name: "Index durchsuchen" }).click();
  const productCard = page.locator(".product-card").first();
  await productCard.getByRole("button", { name: "Nahrwertangaben" }).click();
  await productCard.getByRole("button", { name: "Weiter zum Monatsabo" }).click();
  await expect(page).toHaveURL("/?checkout=pending");
  await page.screenshot({ path: testInfo.outputPath("search-first-localized-checkout.png"), fullPage: true });
});
