import { Request, Response, NextFunction } from "express";
import Product from "../../../models/product.model";
import catchAsync from "../../../utils/catchAsync";
import { ForbiddenError, NotFoundError } from "../../../utils/errors";
import { AuthRequest } from "../../../middlewares/authMiddleware";

const deleteProduct = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { productId } = req.params;

    if (!req.user) {
      throw new ForbiddenError("Authentication required");
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    if (!product.isDeleted) {
      throw new ForbiddenError(
        "Product must be in trash before permanent deletion"
      );
    }

    if (
      req.user.role !== "admin" &&
      product.seller.toString() !== req.user.id
    ) {
      throw new ForbiddenError("You can only delete your own products");
    }

    // Perform hard delete
    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      message: "Product permanently deleted successfully",
    });
  }
);

export default deleteProduct;