import { Response, NextFunction } from "express";
import { AuthRequest } from "../../../middlewares/authMiddleware";
import Coupon from "../../../models/coupon.model";
import { NotFoundError } from "../../../utils/errors";

const updateCoupon = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const code = Array.isArray(req.params.code)
    ? req.params.code[0]
    : req.params.code;

  const updatedCoupon = await Coupon.findOneAndUpdate(
    { code: code.toUpperCase() },
    req.body,
    { new: true, runValidators: true },
  );
  if (!updatedCoupon) {
    throw new NotFoundError("Coupon not found");
  }
  res.status(200).json({
    status: "success",
    data: { coupon: updatedCoupon },
  });
};

export default updateCoupon;
