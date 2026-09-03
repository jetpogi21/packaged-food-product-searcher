import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101";

test("keeps the product finder contained at desktop and phone widths", async ({ page }, testInfo) => {
  await page.route(`${apiBaseUrl}/recent-searches`, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ searches: [] })
  }));
  await page.route(`${apiBaseUrl}/entitlement`, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ status: "inactive", active: false })
  }));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.locator("main")).toHaveCSS("padding-left", "48px");
  await expect(page.locator(".content-shell")).toHaveCSS("max-width", "1152px");
  await expect.poll(async () => (await page.locator(".content-shell").boundingBox())?.x).toBe(144);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);

  await page.setViewportSize({ width: 320, height: 720 });

  await expect(page.locator("main")).toHaveCSS("padding-left", "20px");
  await expect(page.getByLabel("Display language")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

  const selectorBox = await page.getByLabel("Display language").boundingBox();
  expect(selectorBox).not.toBeNull();
  expect(selectorBox!.x + selectorBox!.width).toBeLessThanOrEqual(320);

  await page.screenshot({ path: testInfo.outputPath("responsive-phone.png"), fullPage: true });
});
