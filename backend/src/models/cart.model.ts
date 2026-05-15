import mongoose, { Document, Schema } from "mongoose";
import { IProduct } from "./product.model";
import { IUser } from "./user.model";

export interface ICartItem {
  product: mongoose.Types.ObjectId | IProduct; // ← union type
  quantity: number;
}

export interface ICart extends Document {
  buyer: IUser["_id"];
  items: ICartItem[];
  defaultShippingAddress: string;
}

const CartSchema: Schema = new Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    defaultShippingAddress: { type: String, required: true },
  },
  { timestamps: true },
);

const Cart = mongoose.model<ICart>("Cart", CartSchema);

export default Cart;
