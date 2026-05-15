import Stripe from "stripe";
import axios from "axios";
import { BadRequestError } from "../utils/errors";
import { AuthRequest } from "../middlewares/authMiddleware";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-08-27.basil",
});
export const processStripePayment = async (
  amount: number,
  paymentMethodId: string,
  next: Function,
) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return next(new BadRequestError("Stripe payment failed"));
    }

    return paymentIntent;
  } catch (error) {
    return next(
      new BadRequestError(`Stripe payment error: ${(error as Error).message}`),
    );
  }
};

export const processPaypalPayment = async (amount: number, next: Function) => {
  try {
    const authResponse = await axios.post(
      `${process.env.PAYPAL_MODE === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"}/v1/oauth2/token`,
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID as string,
          password: process.env.PAYPAL_CLIENT_SECRET as string,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const orderResponse = await axios.post(
      `${process.env.PAYPAL_MODE === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount.toFixed(2),
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${authResponse.data.access_token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!orderResponse.data || orderResponse.data.status !== "CREATED") {
      return next(new BadRequestError("PayPal order creation failed"));
    }

    return orderResponse.data;
  } catch (error) {
    return next(
      new BadRequestError(`PayPal payment error: ${(error as Error).message}`),
    );
  }
};
