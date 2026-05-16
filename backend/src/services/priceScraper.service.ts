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
//  Environment check
//  LESSON: process.env.NODE_ENV is "production"
//  on Render and "development" on your local machine.
//  We use this to switch between Puppeteer and Cheerio.
// ─────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === "production";

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
    const raw = match[1];

    const withPercent = text.match(/৳\s*(\d+)%/);
    if (withPercent) {
      const digits = withPercent[1];
      const priceStr = digits.slice(0, -2); // remove last 2 digits (discount %)
      const value = parseFloat(priceStr);
      return isNaN(value) || value === 0 ? null : value;
    }

    const value = parseFloat(raw.replace(/,/g, ""));
    return isNaN(value) || value === 0 || value > 100_000 ? null : value;
  }
  return null;
}

/**
 * Fetch HTML with browser-like headers.
 * LESSON: Without a real User-Agent, many sites return 403 Forbidden
 * because they detect it's a bot. We mimic a real Chrome browser.
 */
async function fetchHTML(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 15_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "keep-alive",
    },
  });
  return data;
}

// ─────────────────────────────────────────────
//  Puppeteer launcher — LOCAL ONLY
//  LESSON: dynamic import is used so the module
//  is never loaded on production (Render).
//  If puppeteer is not installed, this won't crash.
// ─────────────────────────────────────────────
async function launchBrowser() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

// ─────────────────────────────────────────────
//  Daraz — Puppeteer scraper (local development)
// ─────────────────────────────────────────────
async function scrapeDarazPuppeteer(query: string): Promise<ScrapedPrice> {
  const url = `https://www.daraz.com.bd/catalog/?q=${encodeURIComponent(query)}`;
  const source = "Daraz BD";
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req: any) => {
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
        .map((card: any) => ({ fullText: card.textContent?.trim() ?? "" }));
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
    console.error("scrapeDaraz Puppeteer error:", (err as Error).message);
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
//  Daraz — Cheerio scraper (production / Render)
//
//  LESSON: Daraz is React-rendered so Cheerio won't
//  see product cards. Instead we use their internal
//  API endpoint which returns JSON directly —
//  no JS rendering needed!
//
//  Daraz has a search API at:
//  https://www.daraz.com.bd/catalog/?ajax=true&q=...
//  This returns JSON with product data including prices.
// ─────────────────────────────────────────────
async function scrapeDarazCheerio(query: string): Promise<ScrapedPrice> {
  const url = `https://www.daraz.com.bd/catalog/?q=${encodeURIComponent(query)}`;
  const source = "Daraz BD";

  try {
    // Use Daraz's internal API — returns JSON, no JS rendering needed
    const apiUrl = `https://www.daraz.com.bd/catalog/?ajax=true&q=${encodeURIComponent(query)}&page=1`;

    const { data } = await axios.get(apiUrl, {
      timeout: 15_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `https://www.daraz.com.bd/catalog/?q=${encodeURIComponent(query)}`,
      },
    });

    // Daraz API returns items array with price info
    const items =
      data?.mods?.listItems ?? data?.rgv587_aisearchhack?.listItems ?? [];

    if (items.length > 0) {
      const first = items[0];
      const rawPrice = first.price ?? first.priceShow ?? "";
      const name = first.name ?? first.title ?? query;

      return {
        source,
        url,
        productName: String(name).slice(0, 100),
        price: extractFirstPrice(String(rawPrice)),
        currency: "BDT",
        scrapedAt: new Date(),
      };
    }

    // Fallback: parse the HTML page
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Try to find JSON data embedded in script tags (Next.js/SSR pattern)
    let price: number | null = null;
    let productName = query;

    $("script").each((_, el) => {
      const content = $(el).html() ?? "";
      // Look for price patterns in embedded JSON
      const priceMatch = content.match(/"price"\s*:\s*"?([\d.]+)"?/);
      const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
      if (priceMatch && !price) {
        price = parseFloat(priceMatch[1]);
      }
      if (nameMatch && productName === query) {
        productName = nameMatch[1].slice(0, 100);
      }
    });

    return {
      source,
      url,
      productName,
      price,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    console.error("scrapeDaraz Cheerio error:", (err as Error).message);
    return {
      source,
      url: "",
      productName: query,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  }
}

// ─────────────────────────────────────────────
//  Chaldal — Puppeteer scraper (local development)
// ─────────────────────────────────────────────
async function scrapeChaldalPuppeteer(query: string): Promise<ScrapedPrice> {
  const url = `https://chaldal.com/search/${encodeURIComponent(query)}`;
  const source = "Chaldal";
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req: any) => {
      if (
        ["image", "font", "stylesheet", "media"].includes(req.resourceType())
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    await page
      .waitForSelector(".productPane", { timeout: 10_000 })
      .catch(() => null);
    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const cards = document.querySelectorAll(".productPane");
      if (cards.length === 0) {
        const cards2 = document.querySelectorAll(".productV2Catalog");
        return Array.from(cards2)
          .slice(0, 5)
          .map((c: any) => ({ fullText: c.textContent?.trim() ?? "" }));
      }
      return Array.from(cards)
        .slice(0, 5)
        .map((card: any) => ({ fullText: card.textContent?.trim() ?? "" }));
    });

    let productName = query;
    let price: number | null = null;

    for (const item of result) {
      const extracted = extractFirstPrice(item.fullText);
      if (extracted !== null) {
        price = extracted;
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
    console.error("scrapeChaldal Puppeteer error:", (err as Error).message);
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
//  Chaldal — Cheerio scraper (production / Render)
//
//  LESSON: Chaldal has an internal API too.
//  Their app fetches product data from:
//  https://chaldal.com/api/Category/...
//  We use their search endpoint that returns JSON.
// ─────────────────────────────────────────────
async function scrapeChaldalCheerio(query: string): Promise<ScrapedPrice> {
  const url = `https://chaldal.com/search/${encodeURIComponent(query)}`;
  const source = "Chaldal";

  try {
    // Chaldal internal search API
    const apiUrl = `https://chaldal.com/api/Search?searchString=${encodeURIComponent(query)}`;

    const { data } = await axios.get(apiUrl, {
      timeout: 15_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://chaldal.com",
      },
    });

    // Chaldal returns array of products
    const products = Array.isArray(data) ? data : (data?.products ?? []);

    if (products.length > 0) {
      const first = products[0];
      const price = first.price ?? first.regularPrice ?? null;
      const name = first.name ?? first.productName ?? query;

      return {
        source,
        url,
        productName: String(name).slice(0, 100),
        price: price ? parseFloat(String(price)) : null,
        currency: "BDT",
        scrapedAt: new Date(),
      };
    }

    return {
      source,
      url,
      productName: query,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  } catch (err) {
    console.error("scrapeChaldal Cheerio error:", (err as Error).message);
    return {
      source,
      url: "",
      productName: query,
      price: null,
      currency: "BDT",
      scrapedAt: new Date(),
    };
  }
}

// ─────────────────────────────────────────────
//  Direct URL scraper — Puppeteer + Cheerio fallback
// ─────────────────────────────────────────────
export async function scrapeDirectURL(url: string): Promise<ScrapedPrice> {
  const source = new URL(url).hostname;

  const priceSelectors = [
    '[itemprop="price"]',
    '[data-qa-locator="product-item"]',
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

  // Try Puppeteer on local, Cheerio on production
  if (!IS_PRODUCTION) {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on("request", (req: any) => {
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

      const result = await page.evaluate(
        (priceSelectors: string[], titleSelectors: string[]) => {
          const darazCards = document.querySelectorAll(
            '[data-qa-locator="product-item"]',
          );
          if (darazCards.length > 0) {
            const text = darazCards[0].textContent?.trim() ?? "";
            return {
              fullText: text,
              isDarazListing: true,
              name: "",
              price: "",
            };
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
      // fall through to Cheerio
    } finally {
      await browser.close();
    }
  }

  // Cheerio fallback (always used on production)
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Check for Daraz listing — try JSON in script tags
    let price: number | null = null;
    let productName = "";

    $("script").each((_, el) => {
      const content = $(el).html() ?? "";
      if (content.includes("price") && !price) {
        const priceMatch = content.match(/"price"\s*:\s*"?([\d.]+)"?/);
        const nameMatch = content.match(/"name"\s*:\s*"([^"]{5,100})"/);
        if (priceMatch) price = parseFloat(priceMatch[1]);
        if (nameMatch && !productName) productName = nameMatch[1];
      }
    });

    if (!price) {
      for (const sel of priceSelectors) {
        const text = $(sel).first().text().trim();
        if (text) {
          price = extractFirstPrice(text);
          break;
        }
      }
    }

    if (!productName) {
      for (const sel of titleSelectors) {
        const text = $(sel).first().text().trim();
        if (text) {
          productName = text.slice(0, 100);
          break;
        }
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
}

// ─────────────────────────────────────────────
//  Unified scrapers — auto-switch based on env
// ─────────────────────────────────────────────
async function scrapeDaraz(query: string): Promise<ScrapedPrice> {
  if (IS_PRODUCTION) {
    return scrapeDarazCheerio(query);
  }
  return scrapeDarazPuppeteer(query);
}

async function scrapeChaldal(query: string): Promise<ScrapedPrice> {
  if (IS_PRODUCTION) {
    return scrapeChaldalCheerio(query);
  }
  return scrapeChaldalPuppeteer(query);
}

// ─────────────────────────────────────────────
//  Main service function
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
