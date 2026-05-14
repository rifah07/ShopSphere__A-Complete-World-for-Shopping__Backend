import { Request, Response } from "express";
import {
  getCompetitorPriceSuggestion,
  scrapeDirectURL,
} from "../../services/priceScraper.service";
import {
  manualSuggestionSchema,
  scrapeURLSchema,
  productSuggestionSchema,
} from "./scraping.validator";
import Product from "../../models/product.model";

// GET /api/scraping/price-suggestion/:productId
export const getPriceSuggestionForProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { productId } = req.params;

    const parsed = productSuggestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.errors });
      return;
    }

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    // Uncomment when auth middleware is ready:
    // if (product.seller.toString() !== req.user._id.toString()) {
    //   res.status(403).json({ success: false, message: "Forbidden" });
    //   return;
    // }

    const suggestion = await getCompetitorPriceSuggestion(
      product.name,
      product.price,
      parsed.data.competitorUrls,
    );

    res.status(200).json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ success: false, message: "Scraping failed", error });
  }
};

// POST /api/scraping/price-suggestion/manual
// Body: { productName, yourPrice, competitorUrls? }
export const getManualPriceSuggestion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = manualSuggestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.errors });
      return;
    }

    const { productName, yourPrice, competitorUrls } = parsed.data;

    const suggestion = await getCompetitorPriceSuggestion(
      productName,
      yourPrice,
      competitorUrls,
    );

    res.status(200).json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ success: false, message: "Scraping failed", error });
  }
};

// POST /api/scraping/scrape-url
// Body: { url }
export const scrapeSingleURL = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = scrapeURLSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.errors });
      return;
    }

    const result = await scrapeDirectURL(parsed.data.url);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Scraping failed", error });
  }
};
