import express, { type Request, type Response } from "express";
import { searchHistoryStore } from "./search-history.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.net/cgi/search.pl";

type OpenFoodFactsProduct = {
  _id?: string;
  code?: string;
  product_name?: string;
  product_name_en?: string;
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

app.use((_request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/health", (_request, response) => response.json({ ok: true }));

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

  if (!query) {
    response.status(400).json({ error: "A search term is required." });
    return;
  }

  const searchUrl = new URL(OPEN_FOOD_FACTS_URL);
  searchUrl.search = new URLSearchParams({
    action: "process",
    fields: "code,_id,product_name,product_name_en,brands,image_front_url,image_url",
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
      .map(normalizeProduct)
      .filter((product): product is SearchProduct => product !== null);

    await searchHistoryStore().record(query);
    response.json({ products });
  } catch (error) {
    console.error("Open Food Facts search failed", error);
    response.status(502).json({ error: "Product search is temporarily unavailable. Please try again." });
  }
});

function normalizeProduct(product: OpenFoodFactsProduct): SearchProduct | null {
  const name = product.product_name?.trim() || product.product_name_en?.trim();
  const id = product.code?.trim() || product._id?.trim();
  if (!name || !id) return null;

  return {
    id,
    name,
    brand: product.brands?.trim() || null,
    imageUrl: product.image_front_url?.trim() || product.image_url?.trim() || null
  };
}

app.listen(port, () => console.log(`Food search API listening on http://127.0.0.1:${port}`));
