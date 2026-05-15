import mongoose from "mongoose";
import { Response, NextFunction } from "express";
import Cart, { ICartItem } from "../../../models/cart.model";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../utils/errors";
import { AuthRequest } from "../../../middlewares/authMiddleware";

const updateCartItemQuantity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new UnauthorizedError("Unauthorized"));

    const { productId } = req.params;
    const productIdStr = Array.isArray(productId) ? productId[0] : productId;
    const { quantity } = req.body;

    if (!productIdStr) {
      return next(new BadRequestError("Product ID is required"));
    }

    if (!quantity || typeof quantity !== "number" || quantity < 1) {
      return next(
        new BadRequestError(
          "Valid quantity is required (must be a positive number)",
        ),
      );
    }

    const cart = await Cart.findOne({ buyer: userId });
    if (!cart) {
      return next(new NotFoundError("Cart not found"));
    }

    const itemIndex = cart.items.findIndex((item: ICartItem) =>
      item.product instanceof mongoose.Types.ObjectId
        ? item.product.equals(productIdStr)
        : String(item.product) === productIdStr,
    );

    if (itemIndex === -1) {
      return next(new NotFoundError("Product not found in cart"));
    }

    cart.items[itemIndex].quantity = quantity;

    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "_id name price stock imageUrl",
    });

    res.status(200).json({
      status: "success",
      message: "Cart item quantity updated successfully",
      data: { cart },
    });
  } catch (error) {
    next(error);
  }
};

export default updateCartItemQuantity;
