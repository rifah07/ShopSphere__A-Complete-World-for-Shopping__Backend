import { Response, NextFunction } from "express";
import { AuthRequest } from "../../../middlewares/authMiddleware";
import { isValidObjectId, Types } from "mongoose";
import Review from "../../../models/review.model";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../utils/errors";
import updateProductRating from "./updateProductRating";
import { getParam } from "../../../utils/param";

const deleteReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const productId = getParam(req.params.productId);
    const reviewId = getParam(req.params.reviewId);
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!isValidObjectId(productId) || !isValidObjectId(reviewId)) {
      return next(new BadRequestError("Invalid product ID or review ID"));
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return next(new NotFoundError("Review not found"));
    }

    if (String(review.user) !== userId && userRole !== "admin") {
      return next(
        new UnauthorizedError("You are not authorized to delete this review"),
      );
    }

    await Review.findByIdAndDelete(reviewId);

    // update product rating after deleting a review
    await updateProductRating(new Types.ObjectId(productId));

    res.status(200).json({
      status: "success",
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export default deleteReview;
