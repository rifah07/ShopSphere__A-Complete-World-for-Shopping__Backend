import { Router } from "express";
import {
  getPriceSuggestionForProduct,
  getManualPriceSuggestion,
  scrapeSingleURL,
} from "./scraping.controller";
import auth from "../../middlewares/authMiddleware";
import authorize from "../../middlewares/authorize";

const router = Router();

// GET  /api/scraping/price-suggestion/:productId
router.get(
  "/price-suggestion/:productId",
  auth,
  authorize("seller", "admin"),
  getPriceSuggestionForProduct,
);

// POST /api/scraping/price-suggestion/manual
router.post(
  "/price-suggestion/manual",
  auth,
  authorize("seller", "admin"),
  getManualPriceSuggestion,
);

// POST /api/scraping/scrape-url
router.post("/scrape-url", auth, authorize("seller", "admin"), scrapeSingleURL);

export default router;
