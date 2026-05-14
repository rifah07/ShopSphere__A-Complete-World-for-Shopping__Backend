import express from "express";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import morgan from "morgan";
import { morganStream } from "./utils/logger";
import errorHandler from "./handler/errorHandler";
import userRoutes from "./modules/users/users.routes";
import productRoutes from "./modules/products/products.routes";
import orderRoutes from "./modules/orders/orders.routes";
import cartRoutes from "./modules/cart/cart.routes";
import paymentRoutes from "./modules/payment/payment.route";
import wishlistRoutes from "./modules/wishlist/wishlist.routes";
import refundRoutes from "./modules/refund/refunds.routes";
import couponRoutes from "./modules/coupon/coupons.routes";
import reviewRoutes from "./modules/review/review.routes";
import revenueRoutes from "./modules/revenue/revenue.routes";
import { setupSwagger } from "./swagger/setup";
import scrapingRoutes from "./modules/scraping/scraping.routes";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "https://shopsphere-a-complete-world-for-shopping.onrender.com",
      "https://shopsphere-complete-world-for-shopping.lovable.app",
    ],
    credentials: true,
  }),
);
// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response, next: NextFunction, options: any) => {
    res.status(options.statusCode).send(options.message);
  },
});
app.use("/api/", limiter); // apply to all /api routes

// Security Headers
app.use(helmet());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Morgan HTTP logging into Winston
app.use(morgan("combined", { stream: morganStream }));

// Setup Swagger Documentation
setupSwagger(app);

//add routes here
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/scraping", scrapingRoutes);

//end of routes

// Welcome route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to ShopSphere API!",
    version: "1.0.0",
    documentation: `http://localhost:${process.env.PORT || 5000}/api-docs`,
    endpoints: {
      users: "/api/users",
      products: "/api/products",
      orders: "/api/orders",
      cart: "/api/cart",
      wishlist: "/api/wishlist",
      payments: "/api/payment",
      refunds: "/api/refunds",
      coupons: "/api/coupons",
      revenue: "/api/revenue",
      reviews: "/api/review",
    },
  });
});

/*
app.all("*", (req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: `Cannot ${req.method} ${req.originalUrl}. Route not found!`,
    statusCode: 404,
  });
});
*/

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started successfully on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  //console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;
