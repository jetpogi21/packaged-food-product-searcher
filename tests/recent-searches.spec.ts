import { expect, test } from "@playwright/test";

test("records a successful search and offers it as a recent term", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByLabel("What are you looking for?").fill("oat milk");
  await page.getByRole("button", { name: "Search index" }).click();

  const recentSearches = page.getByRole("region", { name: "Recently searched" });
  await expect(recentSearches).toBeVisible();
  await expect(recentSearches.getByRole("button", { name: "oat milk" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("recent-searches.png"), fullPage: true });
});
