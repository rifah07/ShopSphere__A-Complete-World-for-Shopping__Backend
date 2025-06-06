/**
 * @swagger
 * /revenue/:
 *   get:
 *     summary: Get seller's total revenue
 *     description: Calculate and retrieve the total revenue for the authenticated seller from all paid orders. Only includes revenue from the seller's own products.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved seller revenue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sellerRevenue:
 *                       type: number
 *                       format: float
 *                       description: Total revenue from all paid orders for this seller's products
 *                       example: 2487.50
 *             examples:
 *               withRevenue:
 *                 summary: Seller with revenue
 *                 value:
 *                   status: "success"
 *                   data:
 *                     sellerRevenue: 2487.50
 *               noRevenue:
 *                 summary: Seller with no revenue
 *                 value:
 *                   status: "success"
 *                   data:
 *                     sellerRevenue: 0
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User must have seller role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @swagger
 * /revenue/total:
 *   get:
 *     summary: Get platform-wide total revenue (Only by Admin)
 *     description: Retrieves the total revenue from all paid orders across the platform. Only accessible by admin users.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved total revenue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue from all paid orders
 *                       example: 15750.99
 *             examples:
 *               success:
 *                 summary: Successful response
 *                 value:
 *                   status: "success"
 *                   data:
 *                     totalRevenue: 15750.99
 *               no_revenue:
 *                 summary: No revenue found
 *                 value:
 *                   status: "success"
 *                   data:
 *                     totalRevenue: 0
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @swagger
 * /revenue/daily:
 *   get:
 *     summary: Get daily revenue for current day (Only by Admin)
 *     description: Retrieves the total revenue from all paid orders for the current day, grouped by date. Only accessible by admin users.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved daily revenue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyRevenue:
 *                       type: array
 *                       description: Array of daily revenue data for current day
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             format: date
 *                             description: Date in YYYY-MM-DD format
 *                             example: "2025-05-29"
 *                           dailyTotal:
 *                             type: number
 *                             description: Total revenue for the specific day
 *                             example: 1250.75
 *             examples:
 *               with_revenue:
 *                 summary: Daily revenue found
 *                 value:
 *                   status: "success"
 *                   data:
 *                     dailyRevenue:
 *                       - _id: "2025-05-29"
 *                         dailyTotal: 1250.75
 *               no_revenue:
 *                 summary: No revenue for current day
 *                 value:
 *                   status: "success"
 *                   data:
 *                     dailyRevenue: []
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 *
 */

/**
 * @swagger
 * /revenue/weekly:
 *   get:
 *     summary: Get weekly revenue for current week (Only Admin)
 *     description: Retrieves the total revenue from all paid orders for the current week, grouped by week. Only accessible by admin users.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved weekly revenue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     weeklyRevenue:
 *                       type: array
 *                       description: Array of weekly revenue data for current week
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Week identifier in YYYY-W{week_number} format
 *                             example: "2025-W21"
 *                           weeklyTotal:
 *                             type: number
 *                             description: Total revenue for the specific week
 *                             example: 8750.50
 *             examples:
 *               with_revenue:
 *                 summary: Weekly revenue found
 *                 value:
 *                   status: "success"
 *                   data:
 *                     weeklyRevenue:
 *                       - _id: "2025-W21"
 *                         weeklyTotal: 8750.50
 *               no_revenue:
 *                 summary: No revenue for current week
 *                 value:
 *                   status: "success"
 *                   data:
 *                     weeklyRevenue: []
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @swagger
 * /revenue/monthly:
 *   get:
 *     summary: Get monthly revenue for current month (Only Admin)
 *     description: Retrieves the total revenue from all paid orders for the current month, grouped by month. Only accessible by admin users.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved monthly revenue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     monthlyRevenue:
 *                       type: array
 *                       description: Array of monthly revenue data for current month
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Month identifier in YYYY-MM format
 *                             example: "2025-05"
 *                           monthlyTotal:
 *                             type: number
 *                             description: Total revenue for the specific month
 *                             example: 25480.75
 *             examples:
 *               with_revenue:
 *                 summary: Monthly revenue found
 *                 value:
 *                   status: "success"
 *                   data:
 *                     monthlyRevenue:
 *                       - _id: "2025-05"
 *                         monthlyTotal: 25480.75
 *               no_revenue:
 *                 summary: No revenue for current month
 *                 value:
 *                   status: "success"
 *                   data:
 *                     monthlyRevenue: []
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               t$ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @swagger
 * /revenue/yearly:
 *   get:
 *     summary: Get yearly revenue for current year (Only Admin)
 *     description: Retrieves the total revenue from all paid orders for the current year, grouped by year. Only accessible by admin users.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved yearly revenue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     yearlyRevenue:
 *                       type: array
 *                       description: Array of yearly revenue data for current year
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Year identifier in YYYY format
 *                             example: "2025"
 *                           yearlyTotal:
 *                             type: number
 *                             description: Total revenue for the specific year
 *                             example: 156240.85
 *             examples:
 *               with_revenue:
 *                 summary: Yearly revenue found
 *                 value:
 *                   status: "success"
 *                   data:
 *                     yearlyRevenue:
 *                       - _id: "2025"
 *                         yearlyTotal: 156240.85
 *               no_revenue:
 *                 summary: No revenue for current year
 *                 value:
 *                   status: "success"
 *                   data:
 *                     yearlyRevenue: []
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @swagger
 * /revenue/range:
 *   get:
 *     summary: Get revenue by custom date range (Only Admin)
 *     description: Retrieves the total revenue from all paid orders within a specified date range, grouped by day. Only accessible by admin users.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         description: Start date for the revenue range (YYYY-MM-DD format)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-05-01"
 *       - name: endDate
 *         in: query
 *         required: true
 *         description: End date for the revenue range (YYYY-MM-DD format)
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-05-31"
 *     responses:
 *       200:
 *         description: Successfully retrieved revenue by date range
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     revenueByRange:
 *                       type: array
 *                       description: Array of daily revenue data within the specified range
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             format: date
 *                             description: Date in YYYY-MM-DD format
 *                             example: "2025-05-15"
 *                           dailyTotal:
 *                             type: number
 *                             description: Total revenue for the specific day
 *                             example: 750.25
 *             examples:
 *               with_revenue:
 *                 summary: Revenue found within date range
 *                 value:
 *                   status: "success"
 *                   data:
 *                     revenueByRange:
 *                       - _id: "2025-05-01"
 *                         dailyTotal: 1200.50
 *                       - _id: "2025-05-02"
 *                         dailyTotal: 980.75
 *                       - _id: "2025-05-03"
 *                         dailyTotal: 1540.25
 *               no_revenue:
 *                 summary: No revenue found in date range
 *                 value:
 *                   status: "success"
 *                   data:
 *                     revenueByRange: []
 *       400:
 *         description: Bad Request - Missing or invalid date parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *             examples:
 *               missing_dates:
 *                 summary: Missing required date parameters
 *                 value:
 *                   status: "error"
 *                   message: "startDate and endDate are required"
 *               invalid_format:
 *                 summary: Invalid date format
 *                 value:
 *                   status: "error"
 *                   message: "Invalid date format for startDate or endDate"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */

/**
 * @swagger
 * /revenue/sellers:
 *   get:
 *     summary: Get revenue breakdown per seller (Only ADmin)
 *     description: Retrieves the total revenue and order count for each seller based on paid orders. Only accessible by admin users.
 *     tags:
 *       - Revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved revenue per seller
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     revenuePerSeller:
 *                       type: array
 *                       description: Array of revenue data for each seller
 *                       items:
 *                         type: object
 *                         properties:
 *                           sellerId:
 *                             type: string
 *                             description: Unique identifier of the seller
 *                             example: "64a8b2c3f1d2e3a4b5c6d7e8"
 *                           sellerName:
 *                             type: string
 *                             description: Name of the seller
 *                             example: "John's Electronics Store"
 *                           totalRevenue:
 *                             type: number
 *                             description: Total revenue generated by the seller
 *                             example: 12750.99
 *                           orderCount:
 *                             type: number
 *                             description: Total number of order items sold by the seller
 *                             example: 45
 *             examples:
 *               with_sellers:
 *                 summary: Multiple sellers with revenue
 *                 value:
 *                   status: "success"
 *                   data:
 *                     revenuePerSeller:
 *                       - sellerId: "64a8b2c3f1d2e3a4b5c6d7e8"
 *                         sellerName: "John's Electronics Store"
 *                         totalRevenue: 12750.99
 *                         orderCount: 45
 *                       - sellerId: "64a8b2c3f1d2e3a4b5c6d7e9"
 *                         sellerName: "Sarah's Fashion Boutique"
 *                         totalRevenue: 8420.50
 *                         orderCount: 32
 *                       - sellerId: "64a8b2c3f1d2e3a4b5c6d7f0"
 *                         sellerName: "Mike's Sports Gear"
 *                         totalRevenue: 15680.25
 *                         orderCount: 67
 *               no_sellers:
 *                 summary: No sellers found
 *                 value:
 *                   status: "success"
 *                   data:
 *                     revenuePerSeller: []
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Forbidden - User does not have admin privileges
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */