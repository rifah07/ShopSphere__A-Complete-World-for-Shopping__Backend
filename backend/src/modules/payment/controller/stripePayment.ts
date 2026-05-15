import { Response, NextFunction } from "express";
import Stripe from "stripe";
import axios from "axios";
import { AuthRequest } from "../../../middlewares/authMiddleware";
import { UnauthorizedError } from "../../../utils/errors";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});

const stripePayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) return next(new UnauthorizedError("Unauthorized"));

  if (userRole !== "buyer") {
    return next(new UnauthorizedError("Only buyers can make payments"));
  }
  const { amount, currency = "usd", paymentMethodId } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method: paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    return_url:
      process.env.FRONTEND_URL ||
      "https://your-frontend-url.com/payment/success",
  });

  res.status(200).json({
    status: "success",
    message: "Stripe payment successful",
    paymentIntent,
  });
};

export default stripePayment;
