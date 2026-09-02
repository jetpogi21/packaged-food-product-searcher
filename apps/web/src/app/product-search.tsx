"use client";

import { FormEvent, useState } from "react";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
};

type SearchState = "idle" | "loading" | "success" | "empty" | "error";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3001";

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();

    if (!value) {
      setProducts([]);
      setState("error");
      setMessage("Enter a food, brand, or product name to start your search.");
      return;
    }

    setState("loading");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/products?query=${encodeURIComponent(value)}`);
      const payload = (await response.json()) as { products?: Product[]; error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Product search is temporarily unavailable.");

      const nextProducts = payload.products ?? [];
      setProducts(nextProducts);
      setState(nextProducts.length ? "success" : "empty");
      setMessage(nextProducts.length ? `${nextProducts.length} products found for “${value}”.` : `No packaged products matched “${value}”.`);
    } catch (error) {
      setProducts([]);
      setState("error");
      setMessage(error instanceof Error ? error.message : "Product search is temporarily unavailable.");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-6 text-[var(--ink)] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <div className="masthead">
          <p className="eyebrow">Open Food Facts catalogue</p>
          <p className="issue">Issue 01 · Product finder</p>
        </div>

        <div className="hero-grid">
          <div>
            <h1>Find what’s<br /><em>on the label.</em></h1>
            <p className="lede">Search a global index of packaged food products by name, brand, or a familiar shelf-term.</p>
          </div>
          <div className="label-mark" aria-hidden="true">
            <span>FOOD</span><span>INDEX</span><b>↗</b>
          </div>
        </div>

        <form className="search-form" onSubmit={search}>
          <label htmlFor="product-search">What are you looking for?</label>
          <div className="search-row">
            <input
              id="product-search"
              name="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try oat milk, tomato soup, or a brand"
              autoComplete="off"
            />
            <button type="submit" disabled={state === "loading"}>
              {state === "loading" ? "Searching…" : "Search index"}
            </button>
          </div>
        </form>

        <section className="results" aria-labelledby="results-heading" aria-live="polite">
          <div className="results-heading">
            <p className="eyebrow">Catalogue results</p>
            <h2 id="results-heading">
              {state === "idle" && "The shelf is waiting."}
              {state === "success" && message}
              {state === "empty" && "Nothing matched that search."}
              {state === "error" && "Search needs attention."}
              {state === "loading" && "Looking through the catalogue."}
            </h2>
          </div>

          {state === "success" && (
            <ul className="product-grid" aria-label="Product results">
              {products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
            </ul>
          )}

          {state === "loading" && <div className="notice loading">Searching the Open Food Facts catalogue…</div>}
          {state === "empty" && <div className="notice">Try a broader term, another spelling, or the product brand.</div>}
          {state === "error" && <div className="notice error">{message}</div>}
        </section>
      </section>
    </main>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <li className="product-card">
      <div className="image-frame">
        {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span className="missing-image">No package image</span>}
      </div>
      <p className="card-number">{String(index + 1).padStart(2, "0")}</p>
      <h3>{product.name}</h3>
      <p className="brand">{product.brand ?? "Brand not listed"}</p>
    </li>
  );
}
