import puppeteer from "puppeteer";
import axios from "axios";
import * as cheerio from "cheerio";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface ScrapedPrice {
  source: string;
  url: string;
  productName: string;
  price: number | null;
  currency: string;
  scrapedAt: Date;
}

export interface PriceSuggestion {
  yourPrice: number;
  competitorPrices: ScrapedPrice[];
  minCompetitorPrice: number | null;
  maxCompetitorPrice: number | null;
  avgCompetitorPrice: number | null;
  suggestedPrice: number | null;
  suggestion: string;
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/**
 * Extracts the first valid BDT price from a text block.
 *
 * LESSON — Daraz card text format:
 * "ProductName৳ 12040% Off9 soldDhaka"
 *  → ৳ 120 is the price, 40% is the discount
 *  → price and discount % are jammed together with no separator
 *  → we match ৳ + all digits + %, then slice off last 2 digits (the discount)
 *
 * Examples:
 *  "৳ 12040% Off"  → digits="12040" → slice(0,-2) → "120"  ✅
 *  "৳ 29063% Off"  → digits="29063" → slice(0,-2) → "290"  ✅
 *  "৳ 500"         → no % → plain parse → 500               ✅
 */
function extractFirstPrice(text: string): number | null {
  const match = text.match(/৳\s*(\d+)/);
  if (match) {
    const raw = match[1]; // e.g. "12040"

    // If followed by % — last 2 digits are the discount percentage
    const withPercent = text.match(/৳\s*(\d+)%/);
    if (withPercent) {
      const digits = withPercent[1]; // "12040"
      const priceStr = digits.slice(0, -2); // "120" — remove last 2 (discount %)
      const value = parseFloat(priceStr);
      return isNaN(value) || value === 0 ? null : value;
    }

    // No % — price stands alone
    const value = parseFloat(raw.replace(/,/g, ""));
    return isNaN(value) || value === 0 || value > 100_000 ? null : value;
  }

  return null;
}

/**
 * Launches a headless Chrome browser via Puppeteer.
 *
 * LESSON — Why these flags are needed on Linux:
 * --no-sandbox              → Chrome sandbox requires root on Linux, we skip it
 * --disable-setuid-sandbox  → same reason
 * --disable-dev-shm-usage   → /dev/shm is small on cloud servers, prevents crashes
 * --disable-gpu             → not needed in headless mode, saves memory
 */
async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

/**
 * Cheerio-based HTML fetch — used as fallback for static sites.
 *
 * LESSON — Cheerio vs Puppeteer:
 * Cheerio: downloads raw HTML only, fast but blind to JavaScript.
 * Puppeteer: launches real Chrome, runs JS, sees the fully rendered DOM.
 * Modern sites like Daraz/Chaldal need Puppeteer — Cheerio gets empty shells.
 */
async function fetchHTML(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 10_000,
    headers: {
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
//  Daraz scraper
//
//  LESSON — Key decisions from debugging:
//  ✅ [data-qa-locator="product-item"] → stable selector, Daraz uses it
//     for their own QA tests so they never rename it. Class names like
//     "Bm3ON" are hashed and change every deployment — avoid those.
//  ✅ Block images/fonts/css → we only need DOM data, not visuals.
//     This speeds up page load significantly.
//  ✅ page.evaluate() → runs inside real Chrome browser context,
//     not in Node.js. Think of it as opening DevTools console.
//  ✅ waitForSelector → pauses until element exists in DOM.
//     Without this, evaluate() runs before React renders products.
// ─────────────────────────────────────────────
async function scrapeDaraz(query: string): Promise<ScrapedPrice> {
  const url = `https://www.daraz.com.bd/catalog/?q=${encodeURIComponent(query)}`;
  const source = "Daraz BD";
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        ["image", "font", "stylesheet", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    await page.waitForSelector('[data-qa-locator="product-item"]', {
      timeout: 15_000,
    });
    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const cards = document.querySelectorAll(
        '[data-qa-locator="product-item"]',
      );
      return Array.from(cards)
        .slice(0, 5)
        .map((card) => ({ fullText: card.textContent?.trim() ?? "" }));
    });

    let productName = query;
    let price: number | null = null;

    for (const item of result) {
      const extracted = extractFirstPrice(item.fullText);
      if (extracted !== null) {
        price = extracted;
        const namePart = item.fullText.split("৳")[0].trim();
        productName = namePart.slice(0, 100) || query;
        break;
      }
    }

    return {
      source,
      url,
      productName,
      price,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    console.error("scrapeDaraz error:", (err as Error).message);
    return {
      source,
      url,
      productName: query,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } finally {
    // LESSON: always close browser in finally — if you forget,
    // Chrome processes pile up and eventually crash your server
    await browser.close();
  }
}

// ─────────────────────────────────────────────
//  Chaldal scraper
//
//  LESSON — Key decisions from debugging:
//  ✅ ".productPane" → confirmed by debug output to contain real products
//  ❌ ".name" → matched sidebar nav links (Coupons, Offers) not products
//  ❌ ".price" → matched a coupon banner price, not a product price
//  ✅ Chaldal sells groceries — clothing searches return limited results
//     (T-shirt may return combo packs that include a shirt as a gift)
// ─────────────────────────────────────────────
async function scrapeChaldal(query: string): Promise<ScrapedPrice> {
  const url = `https://chaldal.com/search/${encodeURIComponent(query)}`;
  const source = "Chaldal";
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        ["image", "font", "stylesheet", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    // .catch(() => null) → if selector not found, don't throw, just continue
    await page
      .waitForSelector(".productPane", { timeout: 10_000 })
      .catch(() => null);
    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const cards = document.querySelectorAll(".productPane");
      if (cards.length === 0) {
        // Fallback selector confirmed by debug output
        const cards2 = document.querySelectorAll(".productV2Catalog");
        return Array.from(cards2)
          .slice(0, 5)
          .map((c) => ({ fullText: c.textContent?.trim() ?? "" }));
      }
      return Array.from(cards)
        .slice(0, 5)
        .map((card) => ({ fullText: card.textContent?.trim() ?? "" }));
    });

    let productName = query;
    let price: number | null = null;

    for (const item of result) {
      const extracted = extractFirstPrice(item.fullText);
      if (extracted !== null) {
        price = extracted;
        // Chaldal text format: "Out of Stock৳500Tara Care Combo Pack..."
        // Name comes after the price digits
        const parts = item.fullText.split("৳");
        if (parts.length > 1) {
          const afterPrice = parts[1].replace(/^[\d,\s]+/, "").trim();
          productName = afterPrice.slice(0, 100) || query;
        }
        break;
      }
    }

    return {
      source,
      url,
      productName,
      price,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    console.error("scrapeChaldal error:", (err as Error).message);
    return {
      source,
      url,
      productName: query,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────
//  Direct URL scraper — Puppeteer + Cheerio fallback
//
//  LESSON — Two-layer strategy:
//  1. Try Puppeteer first (handles JS-rendered sites)
//  2. If Puppeteer fails, fall back to Cheerio (handles static sites)
//  This makes the scraper work on the widest range of sites.
// ─────────────────────────────────────────────
export async function scrapeDirectURL(url: string): Promise<ScrapedPrice> {
  const source = new URL(url).hostname;

  const priceSelectors = [
    '[itemprop="price"]', // Schema.org — most stable standard
    '[data-qa-locator="product-item"]', // Daraz listing pages
    '[class*="price"]',
    '[class*="Price"]',
    ".product-price",
    "#price",
    ".offer-price",
  ];

  const titleSelectors = [
    '[itemprop="name"]',
    "h1",
    '[class*="product-title"]',
    '[class*="product-name"]',
  ];

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        ["image", "font", "stylesheet", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 2000));

    // LESSON: page.evaluate() can receive Node.js variables as arguments.
    // Anything inside evaluate() runs in browser context — it can't access
    // Node.js variables directly, so we pass them as parameters.
    const result = await page.evaluate(
      (priceSelectors, titleSelectors) => {
        // Check if it's a Daraz listing page
        const darazCards = document.querySelectorAll(
          '[data-qa-locator="product-item"]',
        );
        if (darazCards.length > 0) {
          const text = darazCards[0].textContent?.trim() ?? "";
          return { fullText: text, isDarazListing: true, name: "", price: "" };
        }

        let price = "";
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) {
            price = el.textContent.trim();
            break;
          }
        }

        let name = "";
        for (const sel of titleSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) {
            name = el.textContent.trim();
            break;
          }
        }

        return { price, name, isDarazListing: false, fullText: "" };
      },
      priceSelectors,
      titleSelectors,
    );

    if (result.isDarazListing) {
      const price = extractFirstPrice(result.fullText);
      const namePart = result.fullText.split("৳")[0].trim().slice(0, 100);
      return {
        source,
        url,
        productName: namePart,
        price,
        currency: "BDT",
        scrapedAt: new Date(),
      };
    }

    return {
      source,
      url,
      productName: result.name,
      price: extractFirstPrice(result.price),
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch {
    // Puppeteer failed — fall back to Cheerio for simple static pages
    try {
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);

      let rawPrice = "";
      for (const sel of priceSelectors) {
        const text = $(sel).first().text().trim();
        if (text) {
          rawPrice = text;
          break;
        }
      }

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
        price: extractFirstPrice(rawPrice),
        currency: "BDT",
        scrapedAt: new Date(),
      };
    } catch {
      return {
        source,
        url,
        productName: "",
        price: null,
        currency: "BDT",
        scrapedAt: new Date(),
      };
    }
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────
//  Main service function
//
//  LESSON — Sequential vs Parallel:
//  Cheerio scrapers → use Promise.allSettled (parallel) — lightweight
//  Puppeteer scrapers → run sequentially — each launches a real Chrome
//  process (~150MB RAM). Running 3 in parallel risks crashing the server,
//  especially on Render's free tier (512MB RAM limit).
// ─────────────────────────────────────────────
export async function getCompetitorPriceSuggestion(
  productName: string,
  yourPrice: number,
  competitorUrls: string[] = [],
): Promise<PriceSuggestion> {
  const competitorPrices: ScrapedPrice[] = [];

  const darazResult = await scrapeDaraz(productName).catch((err) => {
    console.error("Daraz scrape error:", err.message);
    return {
      source: "Daraz BD",
      url: "",
      productName,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  });
  competitorPrices.push(darazResult);

  const chaldalResult = await scrapeChaldal(productName).catch((err) => {
    console.error("Chaldal scrape error:", err.message);
    return {
      source: "Chaldal",
      url: "",
      productName,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  });
  competitorPrices.push(chaldalResult);

  for (const url of competitorUrls) {
    const result = await scrapeDirectURL(url).catch(() => ({
      source: new URL(url).hostname,
      url,
      productName: "",
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    }));
    competitorPrices.push(result);
  }

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

  let suggestedPrice: number | null = null;
  let suggestion = "No competitor data found. Keep your current price.";

  if (avgCompetitorPrice !== null) {
    if (yourPrice > avgCompetitorPrice * 1.15) {
      suggestedPrice = Math.round(avgCompetitorPrice * 0.98);
      suggestion = `Your price (৳${yourPrice}) is above market average (৳${avgCompetitorPrice}). Consider lowering to ৳${suggestedPrice}.`;
    } else if (yourPrice < avgCompetitorPrice * 0.85) {
      suggestedPrice = Math.round(avgCompetitorPrice * 0.95);
      suggestion = `Your price (৳${yourPrice}) is well below market average (৳${avgCompetitorPrice}). You could raise to ৳${suggestedPrice} and still be competitive.`;
    } else {
      suggestedPrice = yourPrice;
      suggestion = `Your price (৳${yourPrice}) is competitive vs. market average (৳${avgCompetitorPrice}). No change needed.`;
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
