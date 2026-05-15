import mongoose, { Types } from "mongoose";
import { Response, NextFunction } from "express";
import Cart, { ICartItem } from "../../../models/cart.model";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../utils/errors";
import { AuthRequest } from "../../../middlewares/authMiddleware";

const removeFromCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new UnauthorizedError("Unauthorized"));

    const { productId } = req.params;
    const productIdStr = Array.isArray(productId) ? productId[0] : productId;

    if (!productIdStr) {
      return next(new BadRequestError("Product ID is required"));
    }

    const cart = await Cart.findOne({ buyer: userId });
    if (!cart) {
      return next(new NotFoundError("Cart not found"));
    }

    const originalLength = cart.items.length;

    cart.items = cart.items.filter((item: ICartItem) => {
      return !(item.product instanceof mongoose.Types.ObjectId
        ? item.product.equals(productIdStr)
        : String(item.product) === productIdStr);
    });

    if (cart.items.length === originalLength) {
      return next(new NotFoundError("Product not found in cart"));
    }

    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "_id name price stock imageUrl",
    });

    res.status(200).json({
      status: "success",
      message: "Product removed from cart",
      data: { cart },
    });
  } catch (error) {
    next(error);
  }
};

export default removeFromCart;
