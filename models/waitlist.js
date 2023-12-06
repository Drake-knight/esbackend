import mongoose from "mongoose";
import { EVENT_SLUGS } from "#constants";

const waitlistSchema = new mongoose.Schema({
  // This is an identifier
  // ex: product-construct
  event: {
    type: String,
    enum: EVENT_SLUGS,
    unique: true
  },
  emails: {
    type: [
      {
        type: String,
        lowercase: true
      }
    ]
  },

  creationTime: { type: mongoose.SchemaTypes.Date }
});

waitlistSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

export default mongoose.model("Waitlist", waitlistSchema);
