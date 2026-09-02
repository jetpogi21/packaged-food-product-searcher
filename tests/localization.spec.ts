import { expect, test } from "@playwright/test";

test("switches the product finder to French and requests French product names", async ({ page }, testInfo) => {
  await page.route("http://127.0.0.1:3001/recent-searches", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ searches: [] }) }));
  await page.route("http://127.0.0.1:3001/products?query=avoine&locale=fr", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ locale: "fr", products: [{ id: "fr-oat", name: "Lait d'avoine", brand: "Maison Avoine", imageUrl: null }] }) }));

  await page.goto("/");
  const locale = page.getByLabel("Display language");
  await expect(locale.locator("option")).toHaveText(["English", "Nederlands", "Deutsch", "Français"]);
  await locale.selectOption("fr");

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByLabel("Que cherchez-vous ?")).toBeVisible();
  await expect(page.getByText("Trouvez ce qui")).toBeVisible();
  await page.getByLabel("Que cherchez-vous ?").fill("avoine");
  await page.getByRole("button", { name: "Rechercher dans l'index" }).click();

  await expect(page.getByLabel("Résultats des produits")).toContainText("Lait d'avoine");
  await expect(page.getByText("1 produit trouvé pour \"avoine\".")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("localization-fr.png"), fullPage: true });
});
