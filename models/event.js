import mongoose from "mongoose";
import { EVENT_SLUGS, EVENT_STATUS } from "#constants";

const eventSchema = new mongoose.Schema({
  // This is an identifier
  // ex: product-construct
  slug: {
    type: String,
    enum: EVENT_SLUGS,
    unique: true,
    required: true
  },

  isTeamEvent: { type: Boolean },

  round: { type: Number },
  numOfRounds: { type: Number },
  status: { type: String, enum: EVENT_STATUS },

  questions: [mongoose.SchemaTypes.Mixed],

  creationTime: { type: mongoose.SchemaTypes.Date },
  lastUpdated: { type: mongoose.SchemaTypes.Date }
});

eventSchema.pre("save", function (next) {
  const event = this;
  event.lastUpdated = Date.now();
  next();
});

eventSchema.pre("updateOne", function (next) {
  const event = this;
  event.lastUpdated = Date.now();
  next();
});

export default mongoose.model("Event", eventSchema);
