import express from "express";
import createProduct from "./controller/createProduct";
import auth from "../../middlewares/authMiddleware";
import authorize from "../../middlewares/authorize";
import getAllProducts from "./controller/getAllProducts";
import getSingleProduct from "./controller/getSingleProduct";
import deleteProduct from "./controller/deleteProduct";
import updateProduct from "./controller/updateProduct";
import softDeleteProduct from "./controller/softDeleteProduct";
import getFilteredProducts from "./controller/getFilteredProducts";
import myProducts from "./controller/myProducts";
import getSoftDeletedProducts from "./controller/getSoftDeletedProducts";
import restoreProduct from "./controller/restoreProduct";
import updateProductDiscount from "./controller/updateProductDiscount";
import askProductQuestion from "./controller/askProductQuestion";
import getProductQA from "./controller/getProductQA";
import answerProductQuestion from "./controller/answerProductQuestion";
import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../../utils/errors";

const productRoutes = express.Router();

// middleware to handle validation errors
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new BadRequestError(
        "Validation failed: " + JSON.stringify(errors.array())
      )
    );
  }
  next();
};

//public routes
productRoutes.get("/", getAllProducts);
productRoutes.get("/filteredProducts", getFilteredProducts);

//protected route
productRoutes.post(
  "/addProduct",
  auth,
  authorize("seller", "admin"),
  createProduct
);

productRoutes.get(
  "/deleted",
  auth,
  authorize("seller", "admin"),
  getSoftDeletedProducts
);

//protected route
productRoutes.get("/myProducts", auth, authorize("seller"), myProducts);

//public route with id in query parameter
productRoutes.get("/:productId", getSingleProduct);
productRoutes.get("/:productId/questionsandanswers", getProductQA);

//protected route
productRoutes.post(
  "/:productId/questions",
  auth,
  authorize("buyer"),
  [
    param("productId").isMongoId().withMessage("Invalid product ID"),
    body("question").notEmpty().trim().withMessage("Question cannot be empty"),
  ],
  validate,
  askProductQuestion
);

//protected route
productRoutes.patch(
  "/:productId/discount",
  auth,
  authorize("admin"),
  updateProductDiscount
);

//protected route
//productRoutes.get("/myProducts", auth, authorize("seller"), myProducts);

//protected route
productRoutes.patch(
  "/seller/:productId/discount",
  auth,
  authorize("seller"),
  updateProductDiscount
);

//protected route
productRoutes.patch(
  "/:productId/questions/:questionId/answer",
  auth,
  authorize("seller", "admin"),
  [
    param("productId").isMongoId().withMessage("Invalid product ID"),
    param("questionId").isMongoId().withMessage("Invalid question ID"),
    body("answer").notEmpty().trim().withMessage("Answer cannot be empty"),
  ],
  validate,
  answerProductQuestion
);

//protected route
productRoutes.patch(
  "/:productId",
  auth,
  authorize("seller", "admin"),
  updateProduct
);
productRoutes.delete(
  "/moveToTrash/:productId",
  auth,
  authorize("seller", "admin"),
  softDeleteProduct
);
productRoutes.patch(
  "/restoreProduct/:productId",
  auth,
  authorize("seller", "admin"),
  restoreProduct
);
productRoutes.delete(
  "/completeDelete/:productId",
  auth,
  authorize("seller", "admin"),
  deleteProduct
);

export default productRoutes;