import {
  BSC_COUPON_CODE,
  EVENT_PASS_ITEMS,
  SMAIL_COUPON_CODE
} from "#constants";
import mongoose from "mongoose";

const accomodationSchema = new mongoose.Schema({
  summitID: {
    type: String,
    required: true,
    unique: [true, "Accomodation bought already"]
  },
  // TODO: add a regex check for bought by,
  boughtBy: { type: String, required: true },
  accomodationType: {
    type: String,
    enum: EVENT_PASS_ITEMS
  },
  couponCode: {
    type: String,
    enum: [SMAIL_COUPON_CODE, BSC_COUPON_CODE]
  },
  referralCode: String,
  totalPrice: Number,
  paymentDetails: {
    paymentID: String,
    captured: Boolean
  },

  creationTime: { type: mongoose.SchemaTypes.Date, default: Date.now },
  lastUpdated: { type: mongoose.SchemaTypes.Date, default: Date.now }
});

accomodationSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

accomodationSchema.pre("updateOne", function (next) {
  this.lastUpdated = Date.now();
  next();
});

export default mongoose.model("accomodation", accomodationSchema);
