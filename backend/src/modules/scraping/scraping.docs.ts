/**
 * @openapi
 * components:
 *   schemas:
 *     ScrapedPrice:
 *       type: object
 *       properties:
 *         source:
 *           type: string
 *           example: "Daraz BD"
 *         url:
 *           type: string
 *           example: "https://www.daraz.com.bd/catalog/?q=wireless+headphones"
 *         productName:
 *           type: string
 *           example: "Wireless Bluetooth Headphones Pro"
 *         price:
 *           type: number
 *           nullable: true
 *           example: 1299
 *         currency:
 *           type: string
 *           example: "BDT"
 *         scrapedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-04-25T15:30:00.000Z"
 *
 *     PriceSuggestion:
 *       type: object
 *       properties:
 *         yourPrice:
 *           type: number
 *           example: 1500
 *         competitorPrices:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ScrapedPrice'
 *         minCompetitorPrice:
 *           type: number
 *           nullable: true
 *           example: 1100
 *         maxCompetitorPrice:
 *           type: number
 *           nullable: true
 *           example: 1800
 *         avgCompetitorPrice:
 *           type: number
 *           nullable: true
 *           example: 1299
 *         suggestedPrice:
 *           type: number
 *           nullable: true
 *           example: 1272
 *         suggestion:
 *           type: string
 *           example: "Your price (৳1500) is above market average (৳1299). Consider lowering to ৳1272."
 */

/**
 * @openapi
 * /scraping/price-suggestion/{productId}:
 *   get:
 *     summary: Get competitor price suggestion for an existing product
 *     description: >
 *       Scrapes competitor sites (Daraz, Chaldal, and any optional URLs)
 *       using the existing product's name and price, then returns a
 *       data-driven pricing suggestion for the seller.
 *     tags:
 *       - Scraping
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the product to analyse
 *         example: "6639ac5f95d5896d2dfe15be"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               competitorUrls:
 *                 type: array
 *                 description: Optional list of direct competitor product URLs to also scrape
 *                 items:
 *                   type: string
 *                   example: "https://www.shajgoj.com/product/some-product"
 *     responses:
 *       200:
 *         description: Price suggestion returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PriceSuggestion'
 *       400:
 *         description: Validation error (e.g. invalid competitor URL format)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       401:
 *         description: Unauthorized — login required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden — not the product's seller
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       500:
 *         description: Server error or scraping failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @openapi
 * /scraping/price-suggestion/manual:
 *   post:
 *     summary: Get competitor price suggestion manually (before product exists)
 *     description: >
 *       Useful when a seller wants to research competitive pricing
 *       BEFORE creating a product listing. Pass the product name,
 *       your intended price, and optional competitor URLs.
 *     tags:
 *       - Scraping
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productName
 *               - yourPrice
 *             properties:
 *               productName:
 *                 type: string
 *                 minLength: 2
 *                 example: "Wireless Bluetooth Headphones"
 *               yourPrice:
 *                 type: number
 *                 description: Your intended selling price in BDT
 *                 example: 1500
 *               competitorUrls:
 *                 type: array
 *                 description: Optional direct competitor product URLs
 *                 items:
 *                   type: string
 *                   example: "https://www.daraz.com.bd/products/some-product.html"
 *     responses:
 *       200:
 *         description: Price suggestion returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PriceSuggestion'
 *       400:
 *         description: Validation error — productName or yourPrice missing/invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["yourPrice"]
 *                       message:
 *                         type: string
 *                         example: "yourPrice must be a positive number"
 *       401:
 *         description: Unauthorized — login required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       500:
 *         description: Server error or scraping failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @openapi
 * /scraping/scrape-url:
 *   post:
 *     summary: Scrape a single competitor product URL
 *     description: >
 *       Fetches the HTML of a given URL and attempts to extract
 *       the product name and price using common CSS selectors.
 *       Returns null for price if the page is JS-rendered (e.g. React apps)
 *       since Cheerio cannot execute JavaScript — Puppeteer would be needed
 *       for those cases.
 *     tags:
 *       - Scraping
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: A valid HTTP/HTTPS URL of a competitor product page
 *                 example: "https://www.daraz.com.bd/products/some-product.html"
 *     responses:
 *       200:
 *         description: Page scraped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ScrapedPrice'
 *       400:
 *         description: Missing or invalid URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["url"]
 *                       message:
 *                         type: string
 *                         example: "Must be a valid URL"
 *       401:
 *         description: Unauthorized — login required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       500:
 *         description: Server error or scraping failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
