import { MERCH_COMBOS, MERCH_SINGLES, MERCH_SIZES } from "#constants";
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  items: {
    singles: [
      {
        key: { type: String, enum: MERCH_SINGLES },
        size: { type: String, enum: MERCH_SIZES },
        quantity: { type: Number, max: 10 },
        customisation: String
      }
    ],
    combos: [
      {
        key: {
          type: String,
          enum: MERCH_COMBOS
        },
        quantity: { type: Number, max: 10 },
        products: mongoose.SchemaTypes.Mixed
      }
    ]
  },

  totalAmount: Number,

  deliveryDetails: {
    name: String,
    email: String,
    phone: String,

    address: { type: String, required: true },
    city: { type: String, required: true },
    pinCode: { type: String },
    state: { type: String, required: true }
  },

  paymentDetails: {
    paymentID: { type: String, unique: true },
    captured: Boolean
  },
  referralCode: { type: String, default: "" },

  creationTime: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

orderSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

orderSchema.pre("updateOne", function (next) {
  this.lastUpdated = Date.now();
  next();
});

export default mongoose.model("merch_orders", orderSchema);
