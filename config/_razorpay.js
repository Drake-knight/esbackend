import { IS_PRODUCTION } from "#constants";
import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();
const passesRzpConfig = IS_PRODUCTION
  ? {
    key_id: process.env.RAZORPAY_PASSES_LIVE_KEY_ID,
    key_secret: process.env.RAZORPAY_PASSES_LIVE_KEY_SECRET
  }

  : {
    key_id: process.env.RAZORPAY_PASSES_TEST_KEY_ID,
    key_secret: process.env.RAZORPAY_PASSES_TEST_KEY_SECRET
  };

const shopRzpConfig = IS_PRODUCTION
  ? {
    key_id: process.env.RAZORPAY_SHOP_LIVE_KEY_ID,
    key_secret: process.env.RAZORPAY_SHOP_LIVE_KEY_SECRET
  }
  : {
    key_id: process.env.RAZORPAY_SHOP_TEST_KEY_ID,
    key_secret: process.env.RAZORPAY_SHOP_TEST_KEY_SECRET
  };

export const passesRzp = new Razorpay(passesRzpConfig);
export const shopRzp = new Razorpay(shopRzpConfig);
