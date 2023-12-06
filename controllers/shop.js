import Razorpay from "razorpay";
import { shopRzp } from "#config";
import {
  MERCH_AMOUNTS,
  REFERRAL_CODE_DISCOUNT_MERCH,
  MERCH_KEY_TITLE_MAP
} from "#constants";
import { MerchOrder } from "#models";
import {
  _incrementCACount,
  logger,
  _verifyCAReferralCode,
  sendMail
} from "#utils";

export const createOrder = async (req, res) => {
  try {
    const {
      items: { singles, combos },
      referralCode,
      deliveryDetails
    } = req.body;

    if ([...singles, ...combos].some(item => item.quantity <= 0)) {
      //check for zero and negative numbers
      return res
        .status(400)
        .json({ message: "Go find a real job, you script kiddie" });
    }

    if (referralCode) {
      const isReferralCodeValid = await _verifyCAReferralCode(referralCode);
      if (!isReferralCodeValid) {
        return res.status(400).send("The referral code is invalid");
      }
    }

    const singlesAmount = singles.reduce(
      (price, { key, quantity, customisation }) => {
        return (
          price +
          parseInt(quantity) *
            (MERCH_AMOUNTS[key] + (customisation?.trim() ? 70 : 0))
        );
      },
      0
    );

    const combosAmount = combos.reduce((price, { key, quantity, products }) => {
      const hasCustomisations = Object.values(products).filter(
        ({ customisation }) => customisation
      ).length;
      return (
        price +
        parseInt(quantity) *
          (hasCustomisations
            ? MERCH_AMOUNTS[key].customisation
            : MERCH_AMOUNTS[key].normal || MERCH_AMOUNTS[key])
      );
    }, 0);

    const totalAmount =
      (singlesAmount + combosAmount) *
      100 *
      (referralCode ? REFERRAL_CODE_DISCOUNT_MERCH : 1);
    const order = await shopRzp.orders.create({
      amount: totalAmount,
      currency: "INR",
      notes: {
        referralCode,
        totalAmount: totalAmount / 100,
        deliveryDetails: JSON.stringify(deliveryDetails),
        items: JSON.stringify({
          singles,
          combos
        })
      }
    });

    const orderOptions = {
      key: order.key,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,

      name: "Shop | E-Summit IITM",
      description: "Thank you for shopping!",
      theme: { color: "rgba(0,0,38)" }
    };
    logger.info("Shop order generated");
    res.json(orderOptions);
  } catch (err) {
    switch (err.type) {
      case "REFERRAL_CODE_INVALID":
        logger.error("[Merch order creation]", err?.type);
        return res
          .status(400)
          .json({ message: "The referral code is invalid" });
      default:
        logger.error("[Merch order creation]", {
          message: err?.data?.response?.message
        });
        return res
          .status(401)
          .json({ message: "Error while adding subscription" });
    }
  }
};

export const capturePayment = async (req, res) => {
  const reqSignature = req.headers["x-razorpay-signature"];
  // console.log(req.body);

  const { notes, id: paymentID } = req.body.payload.payment.entity;
  try {
    const isSignatureValid = Razorpay.validateWebhookSignature(
      req.rawBody,
      reqSignature,
      process.env.RAZORPAY_WEBHOOK_SIGNATURE
    );
    if (!isSignatureValid) {
      return res.status(400).end();
    }

    if (req.body.event === "payment.authorized") {
      const { referralCode, totalAmount } = notes;
      const deliveryDetails = JSON.parse(notes.deliveryDetails);
      const items = JSON.parse(notes.items);
      await new MerchOrder({
        items,
        deliveryDetails,
        totalAmount: parseInt(totalAmount),
        paymentDetails: {
          paymentID: paymentID,
          captured: false
        },
        referralCode
      }).save();
      await _incrementCACount("merch", referralCode, deliveryDetails.email);

      logger.info("Saved shop order");
    }

    // handler for payment.captured event
    if (req.body.event === "payment.captured") {
      console.log(paymentID);
      const merchOrderDoc = await MerchOrder.findOneAndUpdate(
        {
          "paymentDetails.paymentID": paymentID
        },
        { "paymentDetails.captured": true }
      ).exec();
      console.log(merchOrderDoc);

      const personalizationData = [
        ...merchOrderDoc.items.singles.map(({ key }) => ({
          name: MERCH_KEY_TITLE_MAP[key]
        })),
        ...merchOrderDoc.items.combos.map(({ key }) => ({
          name: MERCH_KEY_TITLE_MAP[key]
        }))
      ];

      await sendMail(
        merchOrderDoc.deliveryDetails.email,
        "merch-order-confirmation",
        {
          ...merchOrderDoc.deliveryDetails
        },
        personalizationData
      );

      logger.info("Payment Captured for Payment ID: " + paymentID);
    }
  } catch (err) {
    console.log(err);
    logger.error("[Shop Order Capture]", { err, paymentID });
  }
  res.json({ status: "ok" });
};
