import mongoose from "mongoose";
import { EVENT_SLUGS } from "#constants";

const adminSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  scope: [
    {
      type: String,
      enum: [...EVENT_SLUGS, "metrics", "all"]
    }
  ],

  creationTime: { type: Date },
  lastUpdated: { type: Date }
});

adminSchema.pre("save", function (next) {
  const admin = this;
  admin.lastUpdated = Date.now();
  next();
});

adminSchema.pre("updateOne", function (next) {
  const admin = this;
  admin.lastUpdated = Date.now();
  next();
});

export default mongoose.model("Admin", adminSchema);
