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
 * Strips currency symbols/commas and parses a float.
 * "৳ 1,299.00" → 1299   |   "BDT 850" → 850
 */
function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const value = parseFloat(cleaned);
  return isNaN(value) || value === 0 ? null : value;
}

/**
 * LESSON — Puppeteer vs Cheerio:
 *
 * Cheerio:   Downloads raw HTML only. Fast but BLIND to JavaScript.
 *            Modern sites (Daraz, Chaldal) render products via React AFTER
 *            page load — Cheerio never sees those elements.
 *
 * Puppeteer: Launches a real headless Chrome browser, runs JavaScript,
 *            waits for the page to fully render, THEN reads the DOM.
 *            Slower (~3-5s) but sees exactly what a real user sees.
 *
 * Rule of thumb:
 *   Static HTML sites  → use Cheerio (fast, lightweight)
 *   React/JS-heavy     → use Puppeteer (accurate, slower)
 */
async function launchBrowser() {
  return puppeteer.launch({
    //executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",              // required on Linux without root
      "--disable-setuid-sandbox",  // required on Linux without root
      "--disable-dev-shm-usage",   // prevents crashes in low-memory envs (Render)
      "--disable-gpu",             // not needed in headless mode
    ],
  });
}

/**
 * Cheerio-based fetch — still used as fallback for static sites.
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
//  Daraz scraper — uses Puppeteer
//
//  LESSON — How to find selectors on Daraz:
//  1. Open https://www.daraz.com.bd/catalog/?q=t-shirt in Chrome
//  2. Wait for products to load
//  3. Right-click a product price → Inspect
//  4. Look for the class — we use [class*="price"] to be resilient
//     to class name changes (Daraz uses hashed class names)
// ─────────────────────────────────────────────
async function scrapeDaraz(query: string): Promise<ScrapedPrice> {
  const url = `https://www.daraz.com.bd/catalog/?q=${encodeURIComponent(query)}`;
  const source = "Daraz BD";
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    // Block images/fonts/css to speed up page load
    // LESSON: We only need DOM data, not visual assets
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "font", "stylesheet", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });

    // Wait for at least one price element to appear
    // LESSON: waitForSelector pauses execution until the element exists in DOM
    await page.waitForSelector('[class*="price"]', { timeout: 10_000 });

    // page.evaluate() runs code INSIDE the real Chrome browser
    // LESSON: anything inside evaluate() runs in browser context, not Node.js
    const result = await page.evaluate(() => {
      const priceEl = document.querySelector('[class*="price"]');
      const nameEl = document.querySelector('[class*="title"]');
      return {
        price: priceEl?.textContent?.trim() ?? "",
        name: nameEl?.textContent?.trim() ?? "",
      };
    });

    return {
      source,
      url,
      productName: result.name || query,
      price: parsePrice(result.price),
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    return { source, url, productName: query, price: null, currency: "BDT", scrapedAt: new Date() };
  } finally {
    // ALWAYS close the browser in finally block
    // LESSON: if you forget this, Chrome processes pile up and crash your server
    await browser.close();
  }
}

// ─────────────────────────────────────────────
//  Chaldal scraper — uses Puppeteer
//  Chaldal is React-rendered, same issue as Daraz
// ─────────────────────────────────────────────
async function scrapeChaldal(query: string): Promise<ScrapedPrice> {
  const url = `https://chaldal.com/search/${encodeURIComponent(query)}`;
  const source = "Chaldal";
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "font", "stylesheet", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });

    // .catch(() => null) means if selector not found, don't throw — just continue
    await page.waitForSelector(".price", { timeout: 10_000 }).catch(() => null);

    const result = await page.evaluate(() => {
      const priceEl = document.querySelector(".price");
      const nameEl = document.querySelector(".name");
      return {
        price: priceEl?.textContent?.trim() ?? "",
        name: nameEl?.textContent?.trim() ?? "",
      };
    });

    return {
      source,
      url,
      productName: result.name || query,
      price: parsePrice(result.price),
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    return { source, url, productName: query, price: null, currency: "BDT", scrapedAt: new Date() };
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────
//  Direct URL scraper — Puppeteer with Cheerio fallback
// ─────────────────────────────────────────────
export async function scrapeDirectURL(url: string): Promise<ScrapedPrice> {
  const source = new URL(url).hostname;

  const priceSelectors = [
    '[itemprop="price"]',   // Schema.org — most stable standard
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
      if (["image", "font", "stylesheet", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });

    // LESSON: page.evaluate() can receive arguments from Node.js context
    // We pass selector arrays into the browser so it can use them
    const result = await page.evaluate(
      (priceSelectors, titleSelectors) => {
        let price = "";
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) { price = el.textContent.trim(); break; }
        }
        let name = "";
        for (const sel of titleSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) { name = el.textContent.trim(); break; }
        }
        return { price, name };
      },
      priceSelectors,
      titleSelectors
    );

    return {
      source,
      url,
      productName: result.name,
      price: parsePrice(result.price),
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
        if (text) { rawPrice = text; break; }
      }
      let rawName = "";
      for (const sel of titleSelectors) {
        const text = $(sel).first().text().trim();
        if (text) { rawName = text; break; }
      }
      return { source, url, productName: rawName, price: parsePrice(rawPrice), currency: "BDT", scrapedAt: new Date() };
    } catch {
      return { source, url, productName: "", price: null, currency: "BDT", scrapedAt: new Date() };
    }
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────────
//  Main service function
// ─────────────────────────────────────────────
export async function getCompetitorPriceSuggestion(
  productName: string,
  yourPrice: number,
  competitorUrls: string[] = []
): Promise<PriceSuggestion> {

  // NOTE: Run sequentially — Puppeteer launches real Chrome processes.
  // Unlike Cheerio, launching 3+ browsers in parallel can crash the server.
  // LESSON: Promise.allSettled is great for lightweight tasks (Cheerio/axios)
  //         but sequential is safer for heavy tasks (Puppeteer).
  const competitorPrices: ScrapedPrice[] = [];

  const darazResult = await scrapeDaraz(productName).catch(() =>
    ({ source: "Daraz BD", url: "", productName, price: null, currency: "BDT", scrapedAt: new Date() })
  );
  competitorPrices.push(darazResult);

  const chaldalResult = await scrapeChaldal(productName).catch(() =>
    ({ source: "Chaldal", url: "", productName, price: null, currency: "BDT", scrapedAt: new Date() })
  );
  competitorPrices.push(chaldalResult);

  for (const url of competitorUrls) {
    const result = await scrapeDirectURL(url).catch(() =>
      ({ source: new URL(url).hostname, url, productName: "", price: null, currency: "BDT", scrapedAt: new Date() })
    );
    competitorPrices.push(result);
  }

  const validPrices = competitorPrices
    .map((p) => p.price)
    .filter((p): p is number => p !== null);

  const minCompetitorPrice = validPrices.length ? Math.min(...validPrices) : null;
  const maxCompetitorPrice = validPrices.length ? Math.max(...validPrices) : null;
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