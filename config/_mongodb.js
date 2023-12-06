import { logger } from "#utils";
import mongoose from "mongoose";

const MONGO_URI =
  process.env.NODE_ENV === "production"
    ? process.env.MONGODB_URI
    : "mongodb://127.0.0.1:27017/esummit-2023-test";

const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoCreate: true
};

export const connectToMongoDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(MONGO_URI, dbOptions);
    logger.info("MongoDB is connected successfully");
  } catch (e) {
    logger.error(e.message);
    logger.info("MongoDB connection error");
    process.exit(-1);
  }
};
