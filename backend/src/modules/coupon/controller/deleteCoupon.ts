import { Response, NextFunction } from "express";
import { AuthRequest } from "../../../middlewares/authMiddleware";
import Coupon from "../../../models/coupon.model";
import { NotFoundError } from "../../../utils/errors";

const deleteCoupon = async (req: AuthRequest, res: Response) => {
  const code = Array.isArray(req.params.code)
    ? req.params.code[0]
    : req.params.code;

  const deletedCoupon = await Coupon.findOneAndDelete({
    code: code.toUpperCase(),
  });

  if (!deletedCoupon) {
    throw new NotFoundError("Coupon not found");
  }
  res.status(204).send();

  /* res.status(200).json({
    status: "successfully deleted",
    message: "THe coupon deleted"
  }); */
};

export default deleteCoupon;
