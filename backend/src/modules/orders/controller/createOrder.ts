import { Response, NextFunction } from "express";
import Cart, { ICartItem } from "../../../models/cart.model"; // Import ICartItem
import Order from "../../../models/order.model";
import User from "../../../models/user.model";
import Product, { IProduct } from "../../../models/product.model";
import { AuthRequest } from "../../../middlewares/authMiddleware";
import { isValidObjectId, Types } from "mongoose";
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from "../../../utils/errors";
import {
  processPaypalPayment,
  processStripePayment,
} from "../../../services/paymentService";
import Coupon, { CouponStatus } from "../../../models/coupon.model";
import { body } from "express-validator";

interface DirectOrderItem {
  productId: string;
  quantity: number;
}

// Validation middleware for the createOrder route
export const createOrderValidation = [
  body("useCart")
    .optional()
    .isBoolean()
    .withMessage("useCart must be a boolean"),
  body("products")
    .if((value, { req }) => !req.body.useCart)
    .isArray({ min: 1 })
    .withMessage(
      "Products array must contain at least one item for direct order",
    ),
  body("products.*.productId")
    .if((value, { req }) => !req.body.useCart)
    .isMongoId()
    .withMessage("Invalid product ID in products"),
  body("products.*.quantity")
    .if((value, { req }) => !req.body.useCart)
    .isInt({ min: 1 })
    .withMessage("Quantity in products must be at least 1"),
  body("paymentMethod")
    .notEmpty()
    .isIn(["paypal", "stripe", "cod"])
    .withMessage("Invalid payment method"),
  body("paymentMethodId")
    .if((value, { req }) => req.body.paymentMethod === "stripe")
    .optional()
    .notEmpty()
    .withMessage("PaymentMethod ID is required for Stripe"),
  body("shippingAddress")
    .notEmpty()
    .withMessage("Shipping address is required"),
  body("couponCode").optional().trim(),
  body("product")
    .if((value, { req }) => req.body.useCart === true)
    .optional()
    .isMongoId()
    .withMessage("Invalid product ID for single cart item order"),
  body("quantity")
    .if((value, { req }) => req.body.useCart === true)
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity for single cart item order must be at least 1"),
];

const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.id;
  if (!userId) return next(new UnauthorizedError("Unauthorized"));

  const user = await User.findById(userId);
  if (!user) return next(new NotFoundError("User not found"));

  const {
    product: productIdFromBody,
    quantity: singleQuantity,
    products: directOrderItems,
    paymentMethodId,
    paymentMethod,
    shippingAddress: providedAddress,
    couponCode,
    useCart = true,
  } = req.body;

  let orderItems: {
    product: Types.ObjectId;
    quantity: number;
    seller: Types.ObjectId;
    basePrice: number;
    discountAmountForItem: number;
  }[] = [];
  let totalPriceBeforeDiscount = 0;
  let appliedCoupon: any = null;
  let couponDiscountAmount = 0;
  let finalPrice = 0;

  let shippingAddress = providedAddress;

  const calculateItemPriceWithDiscount = (
    product: IProduct,
    quantity: number,
  ) => {
    let discountedPrice = product.price;
    let itemDiscount = 0;
    if (product.discount && product.discount.value > 0) {
      if (product.discount.type === "percentage") {
        itemDiscount = product.price * (product.discount.value / 100);
        discountedPrice -= itemDiscount;
      } else if (product.discount.type === "fixed") {
        itemDiscount = Math.min(product.discount.value, product.price);
        discountedPrice -= itemDiscount;
      }
    }
    return {
      finalPrice: discountedPrice * quantity,
      itemDiscount: itemDiscount * quantity,
      basePrice: product.price * quantity,
    };
  };

  // Process cart-based order
  if (useCart) {
    const cart = await Cart.findOne({ buyer: userId }).populate({
      path: "items.product",
      model: "Product",
      select: "_id name price stock imageUrl seller discount",
    });

    if (cart && cart.items.length > 0) {
      if (!shippingAddress && cart.defaultShippingAddress) {
        shippingAddress = cart.defaultShippingAddress;
      }

      const itemsToProcess = productIdFromBody
        ? cart.items.filter(
            (item: ICartItem) =>
              String((item.product as IProduct)._id) === productIdFromBody,
          )
        : cart.items;

      for (const item of itemsToProcess) {
        const product = item.product as IProduct;
        const quantityToOrder = productIdFromBody
          ? singleQuantity
          : item.quantity;

        if (!product || quantityToOrder > product.stock) continue;

        const {
          finalPrice: itemFinalPrice,
          itemDiscount,
          basePrice,
        } = calculateItemPriceWithDiscount(product, quantityToOrder);

        orderItems.push({
          product: new Types.ObjectId(String(product._id)),
          quantity: quantityToOrder,
          seller: product.seller,
          basePrice: basePrice / quantityToOrder,
          discountAmountForItem: itemDiscount / quantityToOrder,
        });
        totalPriceBeforeDiscount += basePrice;
      }
    }
  }

  // Process direct order items
  if (directOrderItems && Array.isArray(directOrderItems)) {
    for (const item of directOrderItems) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return next(new BadRequestError("Invalid product data in order"));
      }
      if (!isValidObjectId(item.productId)) {
        return next(
          new BadRequestError(`Invalid product ID: ${item.productId}`),
        );
      }

      const product = await Product.findById(item.productId).populate({
        path: "seller",
        model: "User",
        select: "_id",
      });
      if (!product) {
        return next(
          new NotFoundError(`Product with ID ${item.productId} not found`),
        );
      }
      if (item.quantity > product.stock) {
        return next(
          new BadRequestError(`Not enough stock for ${product.name}`),
        );
      }

      const {
        finalPrice: itemFinalPrice,
        itemDiscount,
        basePrice,
      } = calculateItemPriceWithDiscount(product, item.quantity);

      const existingItem = orderItems.find(
        (oi) => String(oi.product) === item.productId,
      );
      if (existingItem) {
        existingItem.quantity += item.quantity;
        existingItem.basePrice =
          (existingItem.basePrice * (existingItem.quantity - item.quantity) +
            basePrice) /
          existingItem.quantity;
        existingItem.discountAmountForItem =
          (existingItem.discountAmountForItem *
            (existingItem.quantity - item.quantity) +
            itemDiscount) /
          existingItem.quantity;
      } else {
        orderItems.push({
          product: new Types.ObjectId(item.productId),
          quantity: item.quantity,
          seller: product.seller._id,
          basePrice: basePrice / item.quantity,
          discountAmountForItem: itemDiscount / item.quantity,
        });
      }
      totalPriceBeforeDiscount += basePrice;
    }
  }

  if (orderItems.length === 0) {
    return next(new BadRequestError("No valid items to order"));
  }

  if (!shippingAddress && user.address) {
    shippingAddress = user.address;
  }
  if (!shippingAddress) {
    return next(
      new BadRequestError(
        "Shipping address is required. Please provide an address or update your account with a default address.",
      ),
    );
  }
  if (
    typeof shippingAddress === "string" &&
    (!shippingAddress.trim() || shippingAddress === "No address provided")
  ) {
    return next(
      new BadRequestError(
        "A valid shipping address is required. Please provide an address.",
      ),
    );
  }

  // Process coupon if provided
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      status: CouponStatus.ACTIVE,
    });

    if (coupon) {
      const now = new Date();
      if (coupon.expiresAt && now > coupon.expiresAt) {
        return next(new BadRequestError("Coupon has expired"));
      }
      if (
        coupon.minOrderValue &&
        totalPriceBeforeDiscount < coupon.minOrderValue
      ) {
        return next(
          new BadRequestError(
            `Minimum order value for this coupon is ${coupon.minOrderValue}`,
          ),
        );
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return next(new BadRequestError("Coupon usage limit reached"));
      }

      appliedCoupon = coupon;
      if (coupon.type === "percentage") {
        couponDiscountAmount = totalPriceBeforeDiscount * (coupon.value / 100);
      } else if (coupon.type === "fixed") {
        couponDiscountAmount = coupon.value;
      }
      couponDiscountAmount = Math.min(
        couponDiscountAmount,
        totalPriceBeforeDiscount,
      );
    } else {
      console.log(`Coupon code "${couponCode}" is invalid or not active.`);
    }
  }

  finalPrice =
    totalPriceBeforeDiscount -
    (couponDiscountAmount +
      orderItems.reduce(
        (sum, item) => sum + item.discountAmountForItem * item.quantity,
        0,
      ));

  let paymentStatus: "unpaid" | "paid" = "unpaid";

  if (paymentMethod === "stripe") {
    const paymentResult = await processStripePayment(
      finalPrice,
      paymentMethodId,
      next,
    );
    if (!paymentResult) return;
    paymentStatus = "paid";
  } else if (paymentMethod === "paypal") {
    const paymentResult = await processPaypalPayment(finalPrice, next);
    if (!paymentResult) return;
    paymentStatus = "paid";
  } else if (paymentMethod === "cod") {
    paymentStatus = "unpaid";
  } else {
    return next(new BadRequestError("Invalid payment method"));
  }

  const order = new Order({
    buyer: userId,
    orderItems: orderItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      seller: item.seller,
      basePrice: item.basePrice,
      discountAmountForItem: item.discountAmountForItem,
    })),
    totalPrice: totalPriceBeforeDiscount,
    shippingAddress,
    paymentMethod,
    paymentStatus,
    couponCode: appliedCoupon?.code,
    discountAmount:
      couponDiscountAmount +
      orderItems.reduce(
        (sum, item) => sum + item.discountAmountForItem * item.quantity,
        0,
      ),
    finalPrice,
  });

  await order.save();

  if (appliedCoupon) {
    appliedCoupon.usageCount += 1;
    await appliedCoupon.save();
  }

  // Update product stock
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock -= item.quantity;
      await product.save();
    }
  }

  // Update cart if using cart
  if (useCart) {
    const cart = await Cart.findOne({ buyer: userId });
    if (cart) {
      const itemsToRemove: string[] = [];
      for (const orderedItem of orderItems) {
        const cartItemIndex = cart.items.findIndex(
          (item: ICartItem) =>
            String(item.product as Types.ObjectId) ===
            String(orderedItem.product),
        );
        if (cartItemIndex !== -1) {
          cart.items[cartItemIndex].quantity -= orderedItem.quantity;
          if (cart.items[cartItemIndex].quantity <= 0) {
            itemsToRemove.push(String(orderedItem.product));
          }
        }
      }
      cart.items = cart.items.filter(
        (item) =>
          !itemsToRemove.includes(String(item.product as Types.ObjectId)),
      );
      await cart.save();
    }
  }

  res.status(201).json({
    status: "success",
    message: "Order created successfully",
    data: order,
  });
};

export default createOrder;
