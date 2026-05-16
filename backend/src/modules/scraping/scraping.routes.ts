import { Router } from "express";
import {
  getPriceSuggestionForProduct,
  getManualPriceSuggestion,
  scrapeSingleURL,
} from "./scraping.controller";
import auth from "../../middlewares/authMiddleware";
import authorize from "../../middlewares/authorize";

const router = Router();

// POST /api/scraping/price-suggestion/manual
router.post(
  "/price-suggestion/manual",
  auth,
  authorize("seller", "admin"),
  getManualPriceSuggestion,
);

// POST /api/scraping/scrape-url
router.post("/scrape-url", auth, authorize("seller", "admin"), scrapeSingleURL);

// POST /api/scraping/price-suggestion/:productId
router.post(
  "/price-suggestion/:productId",
  auth,
  authorize("seller", "admin"),
  getPriceSuggestionForProduct,
);

export default router;
