"use client";

import { FormEvent, useEffect, useState } from "react";

type Product = { id: string; name: string; brand: string | null; imageUrl: string | null };
type SearchState = "idle" | "loading" | "success" | "empty" | "error";
type RecentSearch = { query: string; searchedAt: string };
type Locale = "en" | "nl" | "de" | "fr";
type NutritionFacts = { energyKcalPer100g: number | null; fatPer100g: number | null; saturatedFatPer100g: number | null; carbohydratesPer100g: number | null; sugarsPer100g: number | null; proteinPer100g: number | null; saltPer100g: number | null };
type Entitlement = { active?: boolean };

type Copy = {
  catalogue: string; issue: string; language: string; title: string; titleEmphasis: string; lead: string;
  searchLabel: string; placeholder: string; search: string; searching: string; recentlySearched: string;
  catalogueResults: string; productResults: string; waiting: string; resultFound: string; resultsFound: string;
  noResults: string; attention: string; looking: string; emptyHint: string; missingImage: string;
  brandMissing: string; emptySearch: string; unavailable: string;
};

type BillingCopy = {
  nutritionDetails: string; nutritionLoading: string; subscriptionRequired: string; continueMonthly: string;
  checkoutPending: string; checkoutCancelled: string; per100g: string; energy: string; fat: string;
  saturatedFat: string; carbohydrates: string; sugars: string; protein: string; salt: string;
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

const billingCopy: Record<Locale, BillingCopy> = {
  en: { nutritionDetails: "Nutrition details", nutritionLoading: "Loading nutrition details...", subscriptionRequired: "Nutrition details are available with the monthly plan.", continueMonthly: "Continue to monthly plan", checkoutPending: "Your payment is being confirmed. Nutrition access will appear after Stripe confirms the subscription.", checkoutCancelled: "Checkout was cancelled. Nutrition details remain locked.", per100g: "Per 100g", energy: "Energy", fat: "Fat", saturatedFat: "Saturated fat", carbohydrates: "Carbohydrates", sugars: "Sugars", protein: "Protein", salt: "Salt" },
  nl: { nutritionDetails: "Voedingsdetails", nutritionLoading: "Voedingsdetails laden...", subscriptionRequired: "Voedingsdetails zijn beschikbaar met het maandabonnement.", continueMonthly: "Doorgaan naar maandabonnement", checkoutPending: "Je betaling wordt bevestigd. Toegang verschijnt nadat Stripe het abonnement heeft bevestigd.", checkoutCancelled: "Afrekenen is geannuleerd. Voedingsdetails blijven vergrendeld.", per100g: "Per 100 g", energy: "Energie", fat: "Vet", saturatedFat: "Verzadigd vet", carbohydrates: "Koolhydraten", sugars: "Suikers", protein: "Eiwitten", salt: "Zout" },
  de: { nutritionDetails: "Nahrwertangaben", nutritionLoading: "Nahrwertangaben werden geladen...", subscriptionRequired: "Nahrwertangaben sind mit dem Monatsabo verfügbar.", continueMonthly: "Weiter zum Monatsabo", checkoutPending: "Deine Zahlung wird bestätigt. Der Zugriff erscheint, nachdem Stripe das Abo bestätigt hat.", checkoutCancelled: "Checkout wurde abgebrochen. Nahrwertangaben bleiben gesperrt.", per100g: "Pro 100 g", energy: "Energie", fat: "Fett", saturatedFat: "Gesättigte Fettsäuren", carbohydrates: "Kohlenhydrate", sugars: "Zucker", protein: "Eiweiß", salt: "Salz" },
  fr: { nutritionDetails: "Informations nutritionnelles", nutritionLoading: "Chargement des informations nutritionnelles...", subscriptionRequired: "Les informations nutritionnelles sont disponibles avec le forfait mensuel.", continueMonthly: "Continuer vers le forfait mensuel", checkoutPending: "Votre paiement est en cours de confirmation. L'accès apparaîtra après confirmation de Stripe.", checkoutCancelled: "Le paiement a été annulé. Les informations nutritionnelles restent verrouillées.", per100g: "Pour 100 g", energy: "Énergie", fat: "Matières grasses", saturatedFat: "Acides gras saturés", carbohydrates: "Glucides", sugars: "Sucres", protein: "Protéines", salt: "Sel" }
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3001";

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [entitlementActive, setEntitlementActive] = useState<boolean | null>(null);
  const [selectedNutritionProduct, setSelectedNutritionProduct] = useState<Product | null>(null);
  const [nutrition, setNutrition] = useState<Record<string, NutritionFacts>>({});
  const [nutritionLoadingId, setNutritionLoadingId] = useState<string | null>(null);
  const [nutritionError, setNutritionError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [checkoutState, setCheckoutState] = useState<"pending" | "cancelled" | null>(null);
  const text = copy[locale];
  const billingText = billingCopy[locale];

  async function loadRecentSearches() {
    try {
      const response = await fetch(`${apiBaseUrl}/recent-searches`);
      if (!response.ok) return;
      const payload = (await response.json()) as { searches?: RecentSearch[] };
      setRecentSearches(payload.searches ?? []);
    } catch { /* Recent-search history does not prevent product discovery. */ }
  }

  async function loadEntitlement() {
    try {
      const response = await fetch(`${apiBaseUrl}/entitlement`);
      const entitlement = (await response.json()) as Entitlement;
      setEntitlementActive(response.ok ? entitlement.active === true : null);
    } catch {
      setEntitlementActive(null);
    }
  }

  useEffect(() => { void loadRecentSearches(); }, []);
  useEffect(() => { void loadEntitlement(); }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("checkout");
    setCheckoutState(value === "pending" || value === "cancelled" ? value : null);
  }, []);
  useEffect(() => {
    if (checkoutState !== "pending") return;

    let cancelled = false;
    async function waitForEntitlement() {
      for (let attempt = 0; attempt < 15 && !cancelled; attempt += 1) {
        try {
          const response = await fetch(`${apiBaseUrl}/entitlement`);
          const entitlement = (await response.json()) as Entitlement;
          if (response.ok && entitlement.active) {
            if (!cancelled) {
              setEntitlementActive(true);
              setCheckoutState(null);
              window.history.replaceState({}, "", window.location.pathname);
            }
            return;
          }
        } catch { /* Keep the pending notice while confirmation remains unavailable. */ }

        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
      }
    }

    void waitForEntitlement();
    return () => { cancelled = true; };
  }, [checkoutState]);

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
      setSelectedNutritionProduct(null);
      setNutritionError("");
      setPaymentError("");
      setState(nextProducts.length ? "success" : "empty");
      setMessage(formatResultMessage(nextProducts.length, value, text));
      await loadRecentSearches();
    } catch (error) {
      setProducts([]);
      setState("error");
      setMessage(error instanceof Error ? error.message : text.unavailable);
    }
  }

  async function loadNutrition(product: Product) {
    setSelectedNutritionProduct(product);
    setNutritionError("");
    setPaymentError("");
    if (entitlementActive === false) return;
    setNutritionLoadingId(product.id);
    try {
      const response = await fetch(`${apiBaseUrl}/products/${encodeURIComponent(product.id)}/nutrition`);
      const payload = (await response.json()) as { nutrition?: NutritionFacts; error?: string };
      if (response.status === 403) {
        setEntitlementActive(false);
        return;
      }
      if (!response.ok || !payload.nutrition) throw new Error(payload.error ?? "Nutrition details are temporarily unavailable.");
      setNutrition((current) => ({ ...current, [product.id]: payload.nutrition! }));
    } catch (error) {
      setNutritionError(error instanceof Error ? error.message : "Nutrition details are temporarily unavailable.");
    } finally {
      setNutritionLoadingId(null);
    }
  }

  async function startCheckout() {
    setPaymentError("");
    try {
      const response = await fetch(`${apiBaseUrl}/billing/checkout`, { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Subscription checkout is temporarily unavailable.");
      window.location.assign(payload.url);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Subscription checkout is temporarily unavailable.");
    }
  }

  return (
    <main className="app-shell" lang={locale}>
      <section className="content-shell">
        <div className="masthead">
          <p className="eyebrow">{text.catalogue}</p>
          <div className="masthead-actions">
            <label className="locale-control" htmlFor="locale"><span>{text.language}</span><select id="locale" value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>{languages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}</select></label>
            <p className="issue">{text.issue}</p>
          </div>
        </div>

        <div className="hero-grid">
          <div><h1>{text.title}<br /><em>{text.titleEmphasis}</em></h1><p className="lede">{text.lead}</p></div>
        </div>

        <form className="search-form" onSubmit={search}>
          <label htmlFor="product-search">{text.searchLabel}</label>
          <div className="search-row"><input id="product-search" name="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.placeholder} autoComplete="off" /><button type="submit" disabled={state === "loading"}>{state === "loading" ? text.searching : text.search}</button></div>
        </form>

        {checkoutState === "pending" && <p className="payment-notice" role="status">{billingText.checkoutPending}</p>}
        {checkoutState === "cancelled" && <p className="payment-notice payment-notice-error" role="status">{billingText.checkoutCancelled}</p>}

        {recentSearches.length > 0 && <section className="recent-searches" aria-labelledby="recent-searches-heading" aria-label={text.recentlySearched}><p className="eyebrow" id="recent-searches-heading">{text.recentlySearched}</p><ul>{recentSearches.map((search) => <li key={`${search.query}-${search.searchedAt}`}><button type="button" onClick={() => setQuery(search.query)}>{search.query}</button></li>)}</ul></section>}

        <section className="results" aria-labelledby="results-heading" aria-live="polite">
          <div className="results-heading"><p className="eyebrow">{text.catalogueResults}</p><h2 id="results-heading">{state === "idle" && text.waiting}{state === "success" && message}{state === "empty" && text.noResults}{state === "error" && text.attention}{state === "loading" && text.looking}</h2></div>
          {state === "success" && <ul className="product-grid" aria-label={text.productResults}>{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} text={text} billingText={billingText} nutrition={nutrition[product.id]} loading={nutritionLoadingId === product.id} showSubscriptionGate={selectedNutritionProduct?.id === product.id && !nutrition[product.id] && !nutritionLoadingId} nutritionError={selectedNutritionProduct?.id === product.id ? nutritionError : ""} paymentError={selectedNutritionProduct?.id === product.id ? paymentError : ""} onNutrition={loadNutrition} onStartCheckout={startCheckout} />)}</ul>}
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

function ProductCard({ product, index, text, billingText, nutrition, loading, showSubscriptionGate, nutritionError, paymentError, onNutrition, onStartCheckout }: { product: Product; index: number; text: Copy; billingText: BillingCopy; nutrition: NutritionFacts | undefined; loading: boolean; showSubscriptionGate: boolean; nutritionError: string; paymentError: string; onNutrition: (product: Product) => void; onStartCheckout: () => void }) {
  return <li className="product-card"><div className="image-frame">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span className="missing-image">{text.missingImage}</span>}</div><p className="card-number">{String(index + 1).padStart(2, "0")}</p><h3>{product.name}</h3><p className="brand">{product.brand ?? text.brandMissing}</p><button className="nutrition-button" type="button" disabled={loading} onClick={() => onNutrition(product)}>{loading ? billingText.nutritionLoading : billingText.nutritionDetails}</button>{nutrition && <NutritionPanel nutrition={nutrition} text={billingText} />}{showSubscriptionGate && <aside className="subscription-gate" aria-label="Nutrition subscription gate" aria-live="polite"><p className="eyebrow">{billingText.nutritionDetails}</p><p className="subscription-message">{billingText.subscriptionRequired}</p>{nutritionError && <p className="notice error">{nutritionError}</p>}<button type="button" onClick={onStartCheckout}>{billingText.continueMonthly}</button>{paymentError && <p className="notice error">{paymentError}</p>}</aside>}</li>;
}

function NutritionPanel({ nutrition, text }: { nutrition: NutritionFacts; text: BillingCopy }) {
  const rows: Array<[string, number | null, string]> = [[text.energy, nutrition.energyKcalPer100g, "kcal"], [text.fat, nutrition.fatPer100g, "g"], [text.saturatedFat, nutrition.saturatedFatPer100g, "g"], [text.carbohydrates, nutrition.carbohydratesPer100g, "g"], [text.sugars, nutrition.sugarsPer100g, "g"], [text.protein, nutrition.proteinPer100g, "g"], [text.salt, nutrition.saltPer100g, "g"]];
  return <dl className="nutrition-panel"><div className="nutrition-panel-heading"><dt>{text.nutritionDetails}</dt><dd>{text.per100g}</dd></div>{rows.map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{value === null ? "—" : `${value} ${unit}`}</dd></div>)}</dl>;
}
