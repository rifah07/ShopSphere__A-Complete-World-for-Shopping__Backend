import axios from "axios";
import * as cheerio from "cheerio";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface ScrapedPrice {
  source: string; // site name e.g. "Daraz"
  url: string; // the URL we scraped
  productName: string; // title found on that page
  price: number | null; // parsed price (null if not found)
  currency: string; // e.g. "BDT"
  scrapedAt: Date;
}

export interface PriceSuggestion {
  yourPrice: number;
  competitorPrices: ScrapedPrice[];
  minCompetitorPrice: number | null;
  maxCompetitorPrice: number | null;
  avgCompetitorPrice: number | null;
  suggestedPrice: number | null;
  suggestion: string; // human-readable advice
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/**
 * Strips currency symbols / commas and returns a float.
 * e.g. "৳ 1,299.00"  →  1299
 *      "BDT 850"      →  850
 */
function parsePrice(raw: string): number | null {
  // Remove everything that is not a digit or decimal point
  const cleaned = raw.replace(/[^\d.]/g, "");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

/**
 * Generic fetch helper with a browser-like User-Agent so we
 * don't get blocked immediately by basic bot-detection.
 */
async function fetchHTML(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 10_000, // 10 s
    headers: {
      // Pretend to be a regular Chrome browser
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  return data;
}

// ─────────────────────────────────────────────
//  Site-specific scrapers
//  Each function accepts a search query and
//  returns ONE ScrapedPrice (the first result).
// ─────────────────────────────────────────────

/**
 * Scrape Daraz Bangladesh search results page.
 *
 * LESSON: Open https://www.daraz.com.bd/catalog/?q=laptop in your browser,
 * right-click a product card → "Inspect", find the CSS selector for the
 * price element, and use that here.
 */
async function scrapeDaraz(query: string): Promise<ScrapedPrice> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.daraz.com.bd/catalog/?q=${encodedQuery}`;

  const source = "Daraz BD";

  try {
    const html = await fetchHTML(url);

    // cheerio.load() turns raw HTML into a jQuery-like object ($)
    const $ = cheerio.load(html);

    // CSS SELECTOR LESSON:
    //   '[class*="price"]'  →  any element whose class contains "price"
    //   This is a resilient selector when class names are hashed/dynamic.
    const priceEl = $('[class*="price"]').first();
    const nameEl = $('[class*="title"]').first();

    const rawPrice = priceEl.text().trim();
    const rawName = nameEl.text().trim();

    return {
      source,
      url,
      productName: rawName || query,
      price: parsePrice(rawPrice),
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    // Return a graceful failure — don't crash the whole request
    return {
      source,
      url,
      productName: query,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  }
}

/**
 * Scrape Chaldal (Bangladeshi grocery e-commerce).
 * Shows how to target a DIFFERENT site with DIFFERENT selectors.
 */
async function scrapeChaldal(query: string): Promise<ScrapedPrice> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://chaldal.com/search/${encodedQuery}`;
  const source = "Chaldal";

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Chaldal renders via React (JS-heavy), so static scraping may return
    // an empty shell. This demonstrates the LIMITATION of cheerio:
    // it only parses what's in the initial HTML, not what JS renders later.
    // For JS-rendered pages you'd need Puppeteer (headless Chrome).

    const priceEl = $(".price").first();
    const nameEl = $(".name").first();

    return {
      source,
      url,
      productName: nameEl.text().trim() || query,
      price: parsePrice(priceEl.text()),
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    return {
      source,
      url,
      productName: query,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  }
}

/**
 * Scrape a direct product URL (seller pastes a competitor link).
 * Tries multiple common price selectors — works on many generic sites.
 */
export async function scrapeDirectURL(url: string): Promise<ScrapedPrice> {
  const source = new URL(url).hostname; // e.g. "www.example.com"

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Try a list of common price selectors in order
    const priceSelectors = [
      '[class*="price"]',
      '[itemprop="price"]', // Schema.org markup (very common)
      '[class*="Price"]',
      ".product-price",
      "#price",
      ".offer-price",
    ];

    let rawPrice = "";
    for (const sel of priceSelectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        rawPrice = text;
        break;
      }
    }

    // Common title selectors
    const titleSelectors = [
      "h1",
      '[itemprop="name"]',
      '[class*="product-title"]',
      '[class*="product-name"]',
    ];

    let rawName = "";
    for (const sel of titleSelectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        rawName = text;
        break;
      }
    }

    return {
      source,
      url,
      productName: rawName,
      price: parsePrice(rawPrice),
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    return {
      source,
      url,
      productName: "",
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  }
}

// ─────────────────────────────────────────────
//  Main exported service function
// ─────────────────────────────────────────────

/**
 * Given a product name + the seller's current price, scrape
 * competitor sites in PARALLEL and return a pricing suggestion.
 */
export async function getCompetitorPriceSuggestion(
  productName: string,
  yourPrice: number,
  competitorUrls: string[] = [], // optional: seller pastes direct URLs
): Promise<PriceSuggestion> {
  // Run all scrapers in PARALLEL using Promise.allSettled
  // (allSettled never rejects — even if one scraper fails, others continue)
  const tasks: Promise<ScrapedPrice>[] = [
    scrapeDaraz(productName),
    scrapeChaldal(productName),
    ...competitorUrls.map((url) => scrapeDirectURL(url)),
  ];

  const results = await Promise.allSettled(tasks);

  // Collect only the fulfilled results
  const competitorPrices: ScrapedPrice[] = results
    .filter(
      (r): r is PromiseFulfilledResult<ScrapedPrice> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);

  // Filter to only results that actually have a price
  const validPrices = competitorPrices
    .map((p) => p.price)
    .filter((p): p is number => p !== null);

  const minCompetitorPrice = validPrices.length
    ? Math.min(...validPrices)
    : null;
  const maxCompetitorPrice = validPrices.length
    ? Math.max(...validPrices)
    : null;
  const avgCompetitorPrice = validPrices.length
    ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
    : null;

  // Pricing strategy logic
  let suggestedPrice: number | null = null;
  let suggestion = "No competitor data found. Keep your current price.";

  if (avgCompetitorPrice !== null) {
    if (yourPrice > avgCompetitorPrice * 1.15) {
      // Your price is >15% above average — undercut slightly
      suggestedPrice = Math.round(avgCompetitorPrice * 0.98);
      suggestion = `Your price (৳${yourPrice}) is significantly above the market average (৳${avgCompetitorPrice}). Consider lowering to ৳${suggestedPrice} to stay competitive.`;
    } else if (yourPrice < avgCompetitorPrice * 0.85) {
      // You are way cheaper — maybe you can afford to raise slightly
      suggestedPrice = Math.round(avgCompetitorPrice * 0.95);
      suggestion = `Your price (৳${yourPrice}) is well below the market average (৳${avgCompetitorPrice}). You could raise to ৳${suggestedPrice} and still be competitive.`;
    } else {
      suggestedPrice = yourPrice;
      suggestion = `Your price (৳${yourPrice}) is competitive vs. the market average (৳${avgCompetitorPrice}). No change needed.`;
    }
  }

  return {
    yourPrice,
    competitorPrices,
    minCompetitorPrice,
    maxCompetitorPrice,
    avgCompetitorPrice,
    suggestedPrice,
    suggestion,
  };
}
