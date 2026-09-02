import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { entitlementStore } from "./entitlements.js";
import { searchHistoryStore } from "./search-history.js";
import { constructWebhookEvent, createCheckoutSession, PaymentConfigurationError } from "./stripe.js";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const app = express();
const port = Number(process.env.PORT ?? 3001);
const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.net/cgi/search.pl";

type OpenFoodFactsProduct = {
  _id?: string;
  code?: string;
  product_name?: string;
  product_name_en?: string;
  product_name_nl?: string;
  product_name_de?: string;
  product_name_fr?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
};

type OpenFoodFactsResponse = { products?: OpenFoodFactsProduct[] };

type SearchProduct = {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
};

type NutritionFacts = {
  energyKcalPer100g: number | null;
  fatPer100g: number | null;
  saturatedFatPer100g: number | null;
  carbohydratesPer100g: number | null;
  sugarsPer100g: number | null;
  proteinPer100g: number | null;
  saltPer100g: number | null;
};

const supportedLocales = ["en", "nl", "de", "fr"] as const;
type SupportedLocale = (typeof supportedLocales)[number];

app.use((_request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.post("/stripe/webhook", express.raw({ type: "application/json" }), async (request, response) => {
  try {
    const signature = typeof request.headers["stripe-signature"] === "string" ? request.headers["stripe-signature"] : undefined;
    const event = constructWebhookEvent(request.body, signature);
    await applyStripeEvent(event);
    const processed = await entitlementStore().recordWebhookEvent(event.id, event.type);
    response.json({ received: true, duplicate: !processed });
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      response.status(503).json({ error: "Stripe webhook handling is not configured." });
      return;
    }
    response.status(400).json({ error: "Stripe webhook signature verification failed." });
  }
});

app.get("/health", (_request, response) => response.json({ ok: true }));

app.get("/entitlement", async (_request, response) => {
  try {
    response.json(await entitlementStore().get());
  } catch (error) {
    console.error("Entitlement lookup failed", error);
    response.status(503).json({ error: "Subscription status is temporarily unavailable." });
  }
});

app.post("/billing/checkout", async (_request, response) => {
  try {
    const user = await entitlementStore().demoUser();
    response.json(await createCheckoutSession(user));
  } catch (error) {
    console.error("Checkout session creation failed", error);
    const message = error instanceof PaymentConfigurationError ? "Subscription checkout is not configured yet." : "Subscription checkout is temporarily unavailable.";
    response.status(503).json({ error: message });
  }
});

app.get("/recent-searches", async (_request, response) => {
  try {
    response.json({ searches: await searchHistoryStore().recent() });
  } catch (error) {
    console.error("Recent search lookup failed", error);
    response.status(503).json({ error: "Recent searches are temporarily unavailable." });
  }
});

app.get("/products", async (request: Request, response: Response) => {
  const query = typeof request.query.query === "string" ? request.query.query.trim() : "";
  const locale = parseLocale(request.query.locale);

  if (!query) {
    response.status(400).json({ error: "A search term is required." });
    return;
  }

  const searchUrl = new URL(OPEN_FOOD_FACTS_URL);
  searchUrl.search = new URLSearchParams({
    action: "process",
    fields: "code,_id,product_name,product_name_en,product_name_nl,product_name_de,product_name_fr,brands,image_front_url,image_url",
    json: "1",
    page_size: "12",
    search_simple: "1",
    search_terms: query
  }).toString();

  try {
    const upstream = await fetch(searchUrl, {
      headers: { "User-Agent": "PackagedFoodProductSearcher/1.0" },
      signal: AbortSignal.timeout(10_000)
    });

    if (!upstream.ok) throw new Error(`Open Food Facts returned ${upstream.status}`);

    const payload = (await upstream.json()) as OpenFoodFactsResponse;
    const products = (payload.products ?? [])
      .map((product) => normalizeProduct(product, locale))
      .filter((product): product is SearchProduct => product !== null);

    await searchHistoryStore().record(query);
    response.json({ products, locale });
  } catch (error) {
    console.error("Open Food Facts search failed", error);
    response.status(502).json({ error: "Product search is temporarily unavailable. Please try again." });
  }
});

app.get("/products/:productId/nutrition", async (request, response) => {
  const productId = request.params.productId;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(productId)) {
    response.status(400).json({ error: "A valid product ID is required." });
    return;
  }

  try {
    const entitlement = await entitlementStore().get();
    if (!entitlement.active) {
      response.status(403).json({ error: "A monthly subscription is required to view nutrition details." });
      return;
    }

    if (process.env.NUTRITION_PROVIDER === "mock") {
      response.json({ nutrition: { energyKcalPer100g: 47, fatPer100g: 1.5, saturatedFatPer100g: 0.2, carbohydratesPer100g: 6.7, sugarsPer100g: 4.1, proteinPer100g: 3.4, saltPer100g: 0.12 } });
      return;
    }

    const upstream = await fetch(`https://world.openfoodfacts.net/api/v2/product/${encodeURIComponent(productId)}.json?fields=nutriments`, {
      headers: { "User-Agent": "PackagedFoodProductSearcher/1.0" },
      signal: AbortSignal.timeout(10_000)
    });
    if (!upstream.ok) throw new Error(`Open Food Facts returned ${upstream.status}`);
    const payload = (await upstream.json()) as { product?: { nutriments?: Record<string, unknown> } };
    response.json({ nutrition: normalizeNutrition(payload.product?.nutriments ?? {}) });
  } catch (error) {
    console.error("Nutrition lookup failed", error);
    response.status(502).json({ error: "Nutrition details are temporarily unavailable." });
  }
});

function parseLocale(value: unknown): SupportedLocale {
  return typeof value === "string" && supportedLocales.includes(value as SupportedLocale) ? value as SupportedLocale : "en";
}

function normalizeProduct(product: OpenFoodFactsProduct, locale: SupportedLocale): SearchProduct | null {
  const localizedName = locale === "en" ? product.product_name_en : product[`product_name_${locale}`];
  const name = localizedName?.trim() || product.product_name?.trim() || product.product_name_en?.trim();
  const id = product.code?.trim() || product._id?.trim();
  if (!name || !id) return null;

  return {
    id,
    name,
    brand: product.brands?.trim() || null,
    imageUrl: product.image_front_url?.trim() || product.image_url?.trim() || null
  };
}

async function applyStripeEvent(event: { type: string; data: { object: unknown } }) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { client_reference_id?: string | null; customer?: string | { id: string } | null; subscription?: string | { id: string } | null };
    if (session.client_reference_id) await entitlementStore().linkCheckout(session.client_reference_id, stripeId(session.customer), stripeId(session.subscription));
    return;
  }

  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    const subscription = event.data.object as { metadata?: Record<string, string>; customer?: string | { id: string } | null; id: string; status: string; current_period_end?: number | null };
    const userId = subscription.metadata?.demoUserId;
    if (!userId) return;
    await entitlementStore().updateSubscription({
      userId,
      stripeCustomerId: stripeId(subscription.customer),
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
    });
  }
}

function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function normalizeNutrition(nutriments: Record<string, unknown>): NutritionFacts {
  return {
    energyKcalPer100g: nutritionNumber(nutriments["energy-kcal_100g"]),
    fatPer100g: nutritionNumber(nutriments.fat_100g),
    saturatedFatPer100g: nutritionNumber(nutriments["saturated-fat_100g"]),
    carbohydratesPer100g: nutritionNumber(nutriments.carbohydrates_100g),
    sugarsPer100g: nutritionNumber(nutriments.sugars_100g),
    proteinPer100g: nutritionNumber(nutriments.proteins_100g),
    saltPer100g: nutritionNumber(nutriments.salt_100g)
  };
}

function nutritionNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

app.listen(port, () => console.log(`Food search API listening on http://127.0.0.1:${port}`));
