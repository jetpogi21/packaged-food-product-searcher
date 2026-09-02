"use client";

import { FormEvent, useEffect, useState } from "react";

type Product = { id: string; name: string; brand: string | null; imageUrl: string | null };
type SearchState = "idle" | "loading" | "success" | "empty" | "error";
type RecentSearch = { query: string; searchedAt: string };
type Locale = "en" | "nl" | "de" | "fr";

type Copy = {
  catalogue: string; issue: string; language: string; title: string; titleEmphasis: string; lead: string;
  searchLabel: string; placeholder: string; search: string; searching: string; recentlySearched: string;
  catalogueResults: string; productResults: string; waiting: string; resultFound: string; resultsFound: string;
  noResults: string; attention: string; looking: string; emptyHint: string; missingImage: string;
  brandMissing: string; emptySearch: string; unavailable: string;
};

const languages: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "nl", label: "Nederlands" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" }
];

const copy: Record<Locale, Copy> = {
  en: {
    catalogue: "Open Food Facts catalogue", issue: "Issue 01 · Product finder", language: "Display language", title: "Find what's", titleEmphasis: "on the label.", lead: "Search a global index of packaged food products by name, brand, or a familiar shelf-term.",
    searchLabel: "What are you looking for?", placeholder: "Try oat milk, tomato soup, or a brand", search: "Search index", searching: "Searching...", recentlySearched: "Recently searched",
    catalogueResults: "Catalogue results", productResults: "Product results", waiting: "The shelf is waiting.", resultFound: "1 product found for \"{query}\".", resultsFound: "{count} products found for \"{query}\".",
    noResults: "Nothing matched that search.", attention: "Search needs attention.", looking: "Looking through the catalogue.", emptyHint: "Try a broader term, another spelling, or the product brand.", missingImage: "No package image", brandMissing: "Brand not listed", emptySearch: "Enter a food, brand, or product name to start your search.", unavailable: "Product search is temporarily unavailable. Please try again."
  },
  nl: {
    catalogue: "Open Food Facts-catalogus", issue: "Editie 01 · Productzoeker", language: "Weergavetaal", title: "Vind wat er", titleEmphasis: "op het etiket staat.", lead: "Zoek in een wereldwijde catalogus van verpakte producten op naam, merk of een bekende schapterm.",
    searchLabel: "Waar ben je naar op zoek?", placeholder: "Probeer havermelk, tomatensoep of een merk", search: "Zoek in de index", searching: "Zoeken...", recentlySearched: "Recent gezocht",
    catalogueResults: "Catalogusresultaten", productResults: "Productresultaten", waiting: "Het schap wacht.", resultFound: "1 product gevonden voor \"{query}\".", resultsFound: "{count} producten gevonden voor \"{query}\".",
    noResults: "Geen verpakte producten gevonden.", attention: "De zoekopdracht heeft aandacht nodig.", looking: "De catalogus wordt doorzocht.", emptyHint: "Probeer een bredere term, een andere spelling of het productmerk.", missingImage: "Geen productafbeelding", brandMissing: "Merk niet vermeld", emptySearch: "Voer een product, merk of voedselnaam in om te zoeken.", unavailable: "Producten zoeken is tijdelijk niet beschikbaar. Probeer het opnieuw."
  },
  de: {
    catalogue: "Open Food Facts Katalog", issue: "Ausgabe 01 · Produktsuche", language: "Anzeigesprache", title: "Finde heraus,", titleEmphasis: "was auf dem Etikett steht.", lead: "Durchsuche einen weltweiten Katalog verpackter Lebensmittel nach Name, Marke oder einem vertrauten Regalbegriff.",
    searchLabel: "Wonach suchst du?", placeholder: "Versuche Hafermilch, Tomatensuppe oder eine Marke", search: "Index durchsuchen", searching: "Suche...", recentlySearched: "Zuletzt gesucht",
    catalogueResults: "Katalogergebnisse", productResults: "Produktergebnisse", waiting: "Das Regal wartet.", resultFound: "1 Produkt für \"{query}\" gefunden.", resultsFound: "{count} Produkte für \"{query}\" gefunden.",
    noResults: "Keine verpackten Produkte gefunden.", attention: "Die Suche braucht Aufmerksamkeit.", looking: "Der Katalog wird durchsucht.", emptyHint: "Versuche einen allgemeineren Begriff, eine andere Schreibweise oder die Produktmarke.", missingImage: "Kein Produktbild", brandMissing: "Marke nicht angegeben", emptySearch: "Gib ein Lebensmittel, eine Marke oder einen Produktnamen ein.", unavailable: "Die Produktsuche ist vorübergehend nicht verfügbar. Bitte versuche es erneut."
  },
  fr: {
    catalogue: "Catalogue Open Food Facts", issue: "Édition 01 · Recherche de produits", language: "Langue de l'interface", title: "Trouvez ce qui", titleEmphasis: "figure sur l'étiquette.", lead: "Recherchez dans un catalogue mondial de produits alimentaires emballés par nom, marque ou terme de rayon.",
    searchLabel: "Que cherchez-vous ?", placeholder: "Essayez lait d'avoine, soupe à la tomate ou une marque", search: "Rechercher dans l'index", searching: "Recherche...", recentlySearched: "Recherches récentes",
    catalogueResults: "Résultats du catalogue", productResults: "Résultats des produits", waiting: "Le rayon vous attend.", resultFound: "1 produit trouvé pour \"{query}\".", resultsFound: "{count} produits trouvés pour \"{query}\".",
    noResults: "Aucun produit emballé ne correspond.", attention: "La recherche demande votre attention.", looking: "Recherche dans le catalogue.", emptyHint: "Essayez un terme plus large, une autre orthographe ou la marque du produit.", missingImage: "Aucune image du produit", brandMissing: "Marque non indiquée", emptySearch: "Saisissez un aliment, une marque ou un nom de produit pour commencer.", unavailable: "La recherche de produits est temporairement indisponible. Réessayez plus tard."
  }
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3001";

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const text = copy[locale];

  async function loadRecentSearches() {
    try {
      const response = await fetch(`${apiBaseUrl}/recent-searches`);
      if (!response.ok) return;
      const payload = (await response.json()) as { searches?: RecentSearch[] };
      setRecentSearches(payload.searches ?? []);
    } catch { /* Recent-search history does not prevent product discovery. */ }
  }

  useEffect(() => { void loadRecentSearches(); }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setProducts([]);
      setState("error");
      setMessage(text.emptySearch);
      return;
    }

    setState("loading");
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/products?query=${encodeURIComponent(value)}&locale=${locale}`);
      const payload = (await response.json()) as { products?: Product[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? text.unavailable);

      const nextProducts = payload.products ?? [];
      setProducts(nextProducts);
      setState(nextProducts.length ? "success" : "empty");
      setMessage(formatResultMessage(nextProducts.length, value, text));
      await loadRecentSearches();
    } catch (error) {
      setProducts([]);
      setState("error");
      setMessage(error instanceof Error ? error.message : text.unavailable);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-6 text-[var(--ink)] sm:px-8 lg:px-12" lang={locale}>
      <section className="mx-auto max-w-6xl">
        <div className="masthead">
          <p className="eyebrow">{text.catalogue}</p>
          <div className="masthead-actions">
            <label className="locale-control" htmlFor="locale"><span>{text.language}</span><select id="locale" value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>{languages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}</select></label>
            <p className="issue">{text.issue}</p>
          </div>
        </div>

        <div className="hero-grid">
          <div><h1>{text.title}<br /><em>{text.titleEmphasis}</em></h1><p className="lede">{text.lead}</p></div>
          <div className="label-mark" aria-hidden="true"><span>FOOD</span><span>INDEX</span><b>↗</b></div>
        </div>

        <form className="search-form" onSubmit={search}>
          <label htmlFor="product-search">{text.searchLabel}</label>
          <div className="search-row"><input id="product-search" name="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.placeholder} autoComplete="off" /><button type="submit" disabled={state === "loading"}>{state === "loading" ? text.searching : text.search}</button></div>
        </form>

        {recentSearches.length > 0 && <section className="recent-searches" aria-labelledby="recent-searches-heading" aria-label={text.recentlySearched}><p className="eyebrow" id="recent-searches-heading">{text.recentlySearched}</p><ul>{recentSearches.map((search) => <li key={`${search.query}-${search.searchedAt}`}><button type="button" onClick={() => setQuery(search.query)}>{search.query}</button></li>)}</ul></section>}

        <section className="results" aria-labelledby="results-heading" aria-live="polite">
          <div className="results-heading"><p className="eyebrow">{text.catalogueResults}</p><h2 id="results-heading">{state === "idle" && text.waiting}{state === "success" && message}{state === "empty" && text.noResults}{state === "error" && text.attention}{state === "loading" && text.looking}</h2></div>
          {state === "success" && <ul className="product-grid" aria-label={text.productResults}>{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} text={text} />)}</ul>}
          {state === "loading" && <div className="notice loading">{text.looking}</div>}
          {state === "empty" && <div className="notice">{text.emptyHint}</div>}
          {state === "error" && <div className="notice error">{message}</div>}
        </section>
      </section>
    </main>
  );
}

function formatResultMessage(count: number, query: string, text: Copy) {
  return (count === 1 ? text.resultFound : text.resultsFound).replace("{count}", String(count)).replace("{query}", query);
}

function ProductCard({ product, index, text }: { product: Product; index: number; text: Copy }) {
  return <li className="product-card"><div className="image-frame">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span className="missing-image">{text.missingImage}</span>}</div><p className="card-number">{String(index + 1).padStart(2, "0")}</p><h3>{product.name}</h3><p className="brand">{product.brand ?? text.brandMissing}</p></li>;
}
