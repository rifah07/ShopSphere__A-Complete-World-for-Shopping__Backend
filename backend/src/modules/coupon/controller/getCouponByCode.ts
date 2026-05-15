import { Response, NextFunction } from "express";
import { AuthRequest } from "../../../middlewares/authMiddleware";
import Coupon from "../../../models/coupon.model";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../utils/errors";

const getCouponByCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code } = req.params;
    const codeStr = Array.isArray(code) ? code[0] : code;

    if (!codeStr) {
      return next(new BadRequestError("Coupon code is required"));
    }

    const coupon = await Coupon.findOne({ code: codeStr.toUpperCase() });
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required."));
    }

    if (!coupon) {
      return next(new NotFoundError("Coupon not found"));
    }

    // For sellers, only allow access to their own coupons
    if (
      req.user.role === "seller" &&
      coupon.seller &&
      String(coupon.seller) !== req.user.id
    ) {
      return next(
        new UnauthorizedError("You are not authorized to view this coupon."),
      );
    }

    res.status(200).json({
      status: "success",
      data: { coupon },
    });
  } catch (error) {
    next(error);
  }
};

export default getCouponByCode;
