import { Router } from "express";
import {
  getPriceSuggestionForProduct,
  getManualPriceSuggestion,
  scrapeSingleURL,
} from "./scraping.controller";
import auth from "../../middlewares/authMiddleware";

const router = Router();

// GET  /api/scraping/price-suggestion/:productId
router.get("/price-suggestion/:productId", auth, getPriceSuggestionForProduct);

// POST /api/scraping/price-suggestion/manual
router.post("/price-suggestion/manual", auth, getManualPriceSuggestion);

// POST /api/scraping/scrape-url
router.post("/scrape-url", auth, scrapeSingleURL);

export default router;
