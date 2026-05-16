# 🛍️ ShopSphere Backend – A Complete World for Shopping (API)

ShopSphere is a full-featured backend API for an advanced multivendor e-commerce platform, supporting product management, cart, orders, reviews, payment, revenue tracking, user roles, and AI-powered competitor price suggestions via web scraping. Built using **Node.js**, **Express.js**, **TypeScript**, and **MongoDB**, with robust middleware, security, and API documentation via **Swagger**.

## 🌐 Live API Docs

👉 [https://shopsphere-a-complete-world-for-shopping.onrender.com/api-docs](https://shopsphere-a-complete-world-for-shopping.onrender.com/api-docs)

---

## 🧰 Tech Stack

| Layer         | Technology                  |
| ------------- | --------------------------- |
| Runtime       | Node.js                     |
| Language      | TypeScript                  |
| Framework     | Express.js v5               |
| Database      | MongoDB + Mongoose          |
| Validation    | Zod + Express Validator     |
| Auth          | JWT + Cookies               |
| Payments      | Stripe + PayPal             |
| Scraping      | Puppeteer + Cheerio + Axios |
| Email         | Nodemailer                  |
| Logging       | Morgan + Winston            |
| Security      | Helmet, Rate Limiting, CORS |
| Documentation | Swagger (OpenAPI 3.0)       |

---

## 🚀 Features

### 🧑‍💻 Users

- Register, login, logout
- Role-based access control (admin, seller, buyer)
- Profile management
- Password reset and change
- Account ban management (admin)

### 🛍️ Products

- Full CRUD for products
- Filtering, searching, pagination, sorting
- Soft delete and restore (trash system)
- Seller-specific product management
- Product Q&A (buyers ask, sellers answer)
- Discount management (percentage & fixed)

### ❤️ Wishlist

- Add/remove products from wishlist

### 🛒 Cart

- Add, remove, update cart items
- Default shipping address on cart

### 📦 Orders

- Place orders (from cart or direct)
- Order status and shipment tracking
- Cancel orders
- COD, Stripe, PayPal payment support

### 💳 Payment

- Stripe payment integration
- PayPal payment integration
- Cash on Delivery (COD)

### 🎟️ Coupons

- Create and manage coupons
- Apply during checkout
- Usage limits and expiry dates
- Admin and seller manage own coupons

### 🔁 Refunds

- Request and manage refunds

### 🌟 Reviews

- Submit and view product reviews
- Average rating auto-update on product

### 📈 Revenue

- Revenue tracking for admin and seller dashboards

### 🔍 Competitor Price Scraping _(New)_

- Sellers get AI-powered pricing suggestions based on live competitor data
- Scrapes **Daraz Bangladesh** using Puppeteer (headless Chrome) — handles JS-rendered pages
- Scrapes **Chaldal** for grocery/household product pricing
- Supports custom competitor URLs — sellers paste any product link
- Smart suggestion engine: compares your price vs market average and recommends optimal pricing
- Protected routes — sellers and admins only

---

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.ts                      # MongoDB connection
│   ├── handler/
│   │   └── errorHandler.ts            # Global error handler
│   ├── managers/
│   │   ├── emailManager.ts            # Nodemailer email logic
│   │   └── jwtManager.ts             # JWT generation & verification
│   ├── middlewares/
│   │   ├── authMiddleware.ts          # JWT auth protection
│   │   └── authorize.ts              # Role-based access control
│   ├── models/                        # Mongoose models
│   │   ├── cart.model.ts
│   │   ├── coupon.model.ts
│   │   ├── order.model.ts
│   │   ├── product.model.ts
│   │   ├── refreshToken.model.ts
│   │   ├── refund.model.ts
│   │   ├── review.model.ts
│   │   ├── user.model.ts
│   │   └── wishlist.model.ts
│   ├── modules/                       # Feature-based modules
│   │   ├── cart/
│   │   ├── coupon/
│   │   ├── orders/
│   │   ├── payment/
│   │   ├── products/
│   │   ├── refund/
│   │   ├── revenue/
│   │   ├── review/
│   │   ├── scraping/                  # ← New: competitor price scraping
│   │   │   ├── scraping.controller.ts
│   │   │   ├── scraping.routes.ts
│   │   │   ├── scraping.validator.ts
│   │   │   └── scraping.docs.ts
│   │   ├── users/
│   │   └── wishlist/
│   ├── services/
│   │   └── priceScraper.service.ts    # ← New: Puppeteer + Cheerio scraping logic
│   ├── swagger/                       # Swagger configuration
│   ├── utils/
│   │   ├── catchAsync.ts
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   └── param.ts                  # ← New: req.params type-safe helper
│   ├── validators/
│   │   ├── product.validator.ts
│   │   └── user.validator.ts
│   ├── app.ts
│   └── server.ts
├── .env
├── .example.env
├── .gitignore
├── nodemon.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔍 Scraping API Endpoints

| Method | Endpoint                                    | Description                                  | Access        |
| ------ | ------------------------------------------- | -------------------------------------------- | ------------- |
| POST   | `/api/scraping/price-suggestion/:productId` | Get price suggestion for existing product    | Seller, Admin |
| POST   | `/api/scraping/price-suggestion/manual`     | Get price suggestion before creating product | Seller, Admin |
| POST   | `/api/scraping/scrape-url`                  | Scrape any single competitor URL             | Seller, Admin |

---

## 🧪 API Testing

Use the live Swagger UI for easy testing:
📄 [https://shopsphere-a-complete-world-for-shopping.onrender.com/api-docs](https://shopsphere-a-complete-world-for-shopping.onrender.com/api-docs/)

---

## ✨ Upcoming (Frontend - In Sha Allah)

The React/Next.js frontend will be built in a separate repository and integrated with this backend via secure REST APIs.

---

## 💡 Upcoming Future Features (In Sha Allah)

### 🤖 AI & Smart Features

- **AI Product Description Generator** — seller types a product name, AI writes the full description (OpenAI API)
- **Smart Search with NLP** — search understands "cheap red shirt under 500 taka" not just exact keywords (Elasticsearch or MongoDB Atlas Search)
- **Recommendation Engine** — "Customers also bought" based on order history (collaborative filtering)
- **Fake Review Detection** — ML model to flag suspicious reviews

### 📊 Analytics & Business Intelligence

- **Seller Dashboard Analytics** — charts for daily/weekly/monthly sales, top products, revenue trends
- **Inventory Alerts** — email seller when stock drops below threshold
- **Price History Tracking** — store scraped prices over time, show trend graphs to sellers
- **Abandoned Cart Recovery** — email buyers who left items in cart without ordering

### 🔔 Notifications

- **Real-time Notifications** — WebSocket (Socket.io) for order updates, new questions, review alerts
- **Push Notifications** — for mobile app integration (Firebase FCM)
- **Email Templates** — beautiful HTML emails for order confirmation, shipping updates (React Email or MJML)

### 🛡️ Security & Compliance

- **Two-Factor Authentication (2FA)** — OTP via email or authenticator app
- **Audit Logs** — track who changed what and when (important for admin)
- **GDPR Compliance** — data export and account deletion endpoints
- **IP-based Rate Limiting per User** — prevent scraping/abuse of your own API

### 🌍 Scalability

- **Redis Caching** — cache product listings, scraping results (avoid re-scraping same query within 1 hour)
- **Image Upload** — Cloudinary or AWS S3 integration for product images instead of URL strings
- **Background Jobs** — Bull/BullMQ queue for sending emails, processing orders asynchronously
- **Microservices Ready** — split scraping, payments, notifications into separate services

### 🛒 E-commerce Specific

- **Flash Sales** — time-limited discounts with countdown
- **Bundle Deals** — buy 2 get 1 free type offers
- **Loyalty Points System** — buyers earn points per purchase, redeem for discounts
- **Multi-currency Support** — show prices in USD, BDT, EUR based on user location
- **Product Variants** — size (S/M/L/XL), color, weight options per product
- **Seller Verification** — document upload and admin approval flow for new sellers

---

## 👩‍💻 Developed By

**Rifah Sajida Deya**
BSc in Computer Science & Engineering — Jagannath University, 2025
Backend Engineer | MERN Stack Developer
