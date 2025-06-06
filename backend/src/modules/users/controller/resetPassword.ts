import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../../../models/user.model";
import { ResetPasswordZodSchema } from "../../../validators/user.validator";
import { BadRequestError } from "../../../utils/errors";
import catchAsync from "../../../utils/catchAsync";

const resetPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.query;

    const validatedData = await ResetPasswordZodSchema.safeParseAsync(req.body);

    if (!validatedData.success) {
      res.status(400).json({ errors: validatedData.error.issues });
      return;
    }

    const { newPassword } = validatedData.data;

    if (!token) throw new BadRequestError("Token is required.");

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) throw new BadRequestError("Invalid or expired reset token.");

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      message: "Password has been reset successfully.",
    });
  }
);

export default resetPassword;