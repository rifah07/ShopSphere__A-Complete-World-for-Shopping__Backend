import { Types } from "mongoose";
import Review from "../../../models/review.model";
import Product from "../../../models/product.model";

const updateProductRating = async (productId: Types.ObjectId) => {
  try {
    const aggregationResult = await Review.aggregate([
      {
        $match: { product: { $eq: productId } },
      },
      {
        $group: {
          _id: "$product",
          averageRating: { $avg: "$rating" },
          numberOfReviews: { $sum: 1 },
        },
      },
    ]);

    let averageRating = 0;
    let numberOfReviews = 0;

    if (aggregationResult.length > 0) {
      averageRating = parseFloat(aggregationResult[0].averageRating.toFixed(2));
      numberOfReviews = aggregationResult[0].numberOfReviews;
    }

    await Product.findByIdAndUpdate(productId, {
      averageRating,
      numberOfReviews,
    });
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
};

export default updateProductRating;
