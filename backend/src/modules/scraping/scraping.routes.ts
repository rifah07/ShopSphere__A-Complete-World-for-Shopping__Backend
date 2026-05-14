import { Router } from "express";
import {
  getPriceSuggestionForProduct,
  getManualPriceSuggestion,
  scrapeSingleURL,
} from "./scraping.controller";
// import { protect, sellerOnly } from "../../middlewares/authMiddleware";

const router = Router();

// GET  /api/scraping/price-suggestion/:productId
router.get(
  "/price-suggestion/:productId",
  /* protect, sellerOnly, */ getPriceSuggestionForProduct,
);

// POST /api/scraping/price-suggestion/manual
router.post(
  "/price-suggestion/manual",
  /* protect, sellerOnly, */ getManualPriceSuggestion,
);

// POST /api/scraping/scrape-url
router.post("/scrape-url", /* protect, sellerOnly, */ scrapeSingleURL);

export default router;
