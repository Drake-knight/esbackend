import {
  inRange,
  intersection,
  logger,
  sendMail,
  _verifyCAReferralCode,
  _incrementCACount
} from "#utils";
import { passesRzp } from "#config";
import {
  COUPON_EXHAUSTED,
  EVENT_PASS_AMOUNTS,
  EVENT_PASS_TITLE_SLUG_MAP,
  INVALID_CART_COUPON
} from "../utils/constants.js";
import Razorpay from "razorpay";
import { Accomodation, EventPass, User } from "#models";
import { isSmail } from "../utils/studentUtils.js";

const getDocumentWithoutCertainKeys = (object, arr) =>
  Object.keys(object)
    .filter(key => !arr.includes(key))
    .reduce((acc, key) => ({ ...acc, [key]: object[key] }), {});

/**
 * @param {import("mongoose").MongooseError} err
 * @param {import("express").Response} res
 */
const handleDuplicateKeyError = (err, res) => {
  const field = Object.keys(err.keyValue);
  res.status(409).json({
    message: `You have already availed an event Pass with this ${field}`
  });
};

const handleValidationError = (err, res) => {
  let errors = Object.values(err.errors).map(elem => elem.message);
  let fields = Object.values(err.errors).map(elem => elem.path);
  // if (errors.length > 1) {
  //   res.status(400).json({ message: errors, fields: fields });
  // } else {
  //   res.status(400).json({ message: errors, fields: fields });
  // }
  res.status(400).json({ message: errors, fields });
};

/**
 *
 * @param {Object} e
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns
 */
// eslint-disable-next-line  no-unused-vars
const mongooseErrorHandler = (e, res) => {
  logger.error(e);
  if (e.name === "ValidationError") return handleValidationError(e, res);
  if (e.code && e.code === 11000) return handleDuplicateKeyError(e, res);
  return res.status(400).json({
    message: e.message
  });
};

const _checkDuplicates = obj => {
  const hasDuplicatesForSinglePass = Object.values(obj).some(users => {
    if (!Array.isArray(users)) {
      // coupon code field in object
      return false;
    }
    const summitIDOfUsers = users.map(user => user.summitID);
    // check cause coupon code is not an array
    if (Array.isArray(summitIDOfUsers)) {
      if (new Set(summitIDOfUsers).size != summitIDOfUsers.length) {
        return true;
      }
    }
  });

  if (
    intersection(
      [obj?.allAccessPassUsers, obj?.basicPassUsers, obj?.premiumPassUsers]
        .flat()
        .map(user => user?.summitID)
    )
  ) {
    return true;
  }
  if (
    intersection(
      [obj?.threeDayStay, obj?.fourDayStay].flat().map(user => user?.summitID)
    )
  ) {
    return true;
  }
  return hasDuplicatesForSinglePass;
};

const _checkIfPassAlreadyAvailed = async summitIDs => {
  const users = await User.find({ summitID: { $in: summitIDs } }).lean();
  const ans = users.some(user => user.registeredPass);
  return ans;
};

const _checkIfAccomodationAlreadyAvailed = async summitIDs => {
  const users = await User.find({ summitID: { $in: summitIDs } }).lean();
  const ans = users.some(user => user.accomodationStatus);
  return ans;
};

export const createOrder = async (req, res) => {
  const { items, summitIDs, referralCode } = req.body;
  if (_checkDuplicates(summitIDs)) {
    //check for duplicates
    return res.status(400).json({ message: "Duplicate summit IDs" });
  }

  if (items.some(item => item.number <= 0)) {
    //check for zero and negative numbers
    return res
      .status(400)
      .json({ message: "Go find a real job, you script kiddie" });
  }

  // passes registration is closed
  if (
    items.some(({ title }) =>
      [
        "Basic student pass",
        "Premium student pass",
        "Professional pass"
      ].includes(title)
    )
  ) {
    return res.status(400).json({ message: "Passes have been sold out" });
  }
  // check if all the summitIDs are in the users collection
  logger.info({ items });
  // map through items get all the users whose item title is "Basic student pass","yada yada","bruh"
  const passUserSummitIDs = items
    .map(item => {
      if (
        [
          "Basic student pass",
          "Premium student pass",
          "Professional pass"
        ].includes(item.title)
      )
        return item.users.map(({ summitID }) => summitID);
    })
    .flat();

  const accomodationUserSummitIDs = items
    .map(item => {
      if (
        [
          "3 days + 2 nights accomodation",
          "4 days + 3 nights accomodation"
        ].includes(item.title)
      )
        return item.users.map(({ summitID }) => summitID);
    })
    .flat();

  if (
    (await _checkIfPassAlreadyAvailed(passUserSummitIDs)) ||
    (await _checkIfAccomodationAlreadyAvailed(accomodationUserSummitIDs))
  ) {
    return res.status(400).json({
      message:
        "Some of these summitIDs have already availed passes/accomodation"
    });
  }

  logger.info({
    users: items
      .map(({ users }) => users)
      .flat()
      .map(({ summitID }) => summitID)
  });
  const summitIDsFromFrontend = Array.from(
    new Set(
      items
        .map(({ users }) => users)
        .flat()
        .map(({ summitID }) => summitID)
    )
  );
  const summitIDsFromDB = await User.find({
    summitID: {
      $in: summitIDsFromFrontend
    }
  }).lean();

  if (summitIDsFromDB.length !== summitIDsFromFrontend.length) {
    return res
      .status(400)
      .json({ message: "Some of these summitIDs are invalid" });
  }
  let sanitizedItems = items;

  console.log({ sanitizedItems });

  const numOfPasses = sanitizedItems.reduce((acc, curr) => {
    if (
      [
        "Basic student pass",
        "Premium student pass",
        "Professional pass"
      ].includes(curr.title)
    )
      return acc + curr.number;
    return acc;
  }, 0);
  let discountPercentage = 0;
  if (inRange(numOfPasses, 3, 4)) discountPercentage = 15;
  if (inRange(numOfPasses, 5, 9)) discountPercentage = 20;
  if (inRange(numOfPasses, 10, Infinity)) discountPercentage = 25;

  if (referralCode) {
    try {
      await _verifyCAReferralCode(referralCode);
      discountPercentage =
        discountPercentage + 10 - Math.floor(discountPercentage / 10);
    } catch (err) {
      logger.error("[Order creation]", err.response.data);
      return res.status(400).json({ message: err.response.data });
    }
  }

  const amount =
    Math.ceil(
      sanitizedItems.reduce((acc, cartItem) => {
        const itemPrice =
          cartItem.users.length *
          (cartItem?.backendSetPrice === 0
            ? 0
            : EVENT_PASS_AMOUNTS[cartItem.title]);
        const itemPriceWithDiscount =
          itemPrice *
          ([
            "Basic student pass",
            "Premium student pass",
            "Professional pass"
          ].includes(cartItem.title)
            ? (100 - discountPercentage) / 100
            : 1);
        return acc + itemPriceWithDiscount;
      }, 0)
    ) * 100;
  logger.info(amount);
  if (amount === 0) {
    if (
      items.every(item =>
        [
          "Basic student pass",
          "Professional pass",
          "3 days + 2 nights accomodation",
          "4 days + 3 nights accomodation"
        ].includes(item.title)
      ) ||
      items.some(item => item.number > 1)
    ) {
      const error = new Error(
        "You can only avail a single student premium pass with coupon codes"
      );
      error.type = INVALID_CART_COUPON;
      throw error;
    }

    const newPass = new EventPass({
      summitID: res.locals.summitID,
      pass: "PREMIUM_STUDENT_PASS",
      boughtBy: res.locals.summitID,
      totalPrice: 0,
      couponCode: "IITM_BSC",
      paymentDetails: {
        paymentID: "COUPON_IITM_BSC",
        captured: true
      }
    });
    await Promise.all([
      newPass.save(),
      User.updateOne(
        { summitID: res.locals.summitID },
        { registeredPass: "PREMIUM_STUDENT_PASS" }
      )
    ]);

    return res.status(200).json({ message: "Transaction succesful" });
  }
  const options = {
    amount,
    currency: "INR",
    notes: {
      items: JSON.stringify(
        items.map(item =>
          getDocumentWithoutCertainKeys(item, ["price", "description"])
        )
      ),
      boughtBy: res.locals.summitID,
      referralCode
    }
  };
  try {
    const order = await passesRzp.orders.create(options);
    console.log({ order });
    if (order) {
      const orderOptions = {
        key: order.key,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        notes: order.notes,
        name: "E-Summit Passes",
        description: "Inspirit, Masterclasses and Workshops",
        theme: { color: "rgba(0,0,38)" }
      };
      logger.info("Order generated", order.id);
      res.json(orderOptions);
    } else {
      return res
        .status(401)
        .json({ message: "Subscription could not be added" });
    }
  } catch (err) {
    switch (err.type) {
      case COUPON_EXHAUSTED:
        logger.error("[Order creation]", err?.type);
        return res.status(400).json({ message: "Coupon code is exhausted" });
      case INVALID_CART_COUPON:
        logger.error("[Order creation]", err?.type);
        return res.status(400).json({ message: err.message });
      default:
        logger.error("[Order creation]", {
          message: err?.data?.response?.message
        });
        return res
          .status(401)
          .json({ message: "Error while adding subscription" });
    }
  }
};

export const capturePayment = async (req, res) => {
  try {
    const reqSignature = req.headers["x-razorpay-signature"];

    const isSignatureValid = Razorpay.validateWebhookSignature(
      req.rawBody,
      reqSignature,
      process.env.RAZORPAY_WEBHOOK_SIGNATURE
    );
    logger.info("Webhook Signature Valid:" + isSignatureValid);

    if (!isSignatureValid) {
      return res.status(400).end();
    }
    const { notes, id: paymentID } = req.body.payload.payment.entity;
    if (notes.roll) {
      // Internfair
      return res.json({ status: "ok" });
    }
    const items = JSON.parse(notes.items || "{}");
    const referralCode = notes.referralCode;
    logger.info({ items });
    const boughtBy = notes.boughtBy;

    logger.info("notes", notes);
    logger.info(req.body.event);

    if (req.body.event === "payment.authorized") {
      for (const itemIndex in items) {
        logger.info("In here");
        const item = items[itemIndex];
        const users = items[itemIndex].users;
        logger.info({ item: items[itemIndex] });
        for (const userIndex in users) {
          const user = users[userIndex];
          if (
            [
              "3 days + 2 nights accomodation",
              "4 days + 3 nights accomodation"
            ].includes(item.title)
          ) {
            const accomodation = new Accomodation({
              summitID: user.summitID,
              boughtBy,
              accomodationType: EVENT_PASS_TITLE_SLUG_MAP[item.title],
              paymentDetails: {
                paymentID,
                captured: false
              },
              ...(referralCode && { referralCode })
            });
            logger.info({ accomodation });
            await Promise.all([
              accomodation.save(),
              User.updateOne(
                { summitID: user.summitID },
                { accomodationStatus: EVENT_PASS_TITLE_SLUG_MAP[item.title] }
              )
            ]);
            const { email } = await User.findOne({
              summitID: user.summitID
            }).lean();
            await sendMail(email, "accomodation-status", {
              accomodation: item.title
            });
          } else if (
            [
              "Basic student pass",
              "Premium student pass",
              "Professional pass"
            ].includes(item.title)
          ) {
            const pass = new EventPass({
              summitID: user.summitID,
              boughtBy,
              pass: EVENT_PASS_TITLE_SLUG_MAP[item.title],
              paymentDetails: {
                paymentID,
                captured: false
              },
              ...(referralCode && { referralCode })
            });
            logger.info({ pass });
            await Promise.all([
              pass.save(),
              User.updateOne(
                { summitID: user.summitID },
                {
                  registeredPass: EVENT_PASS_TITLE_SLUG_MAP[item.title]
                }
              ),
              _incrementCACount("passes", referralCode, user.summitID)
            ]);
            const { email } = await User.findOne({
              summitID: user.summitID
            }).lean();
            await sendMail(email, "pass-notification", {
              pass: item.title
            });
          }
        }
        logger.info("Issued E-Summit Pass");
      }
    }
    if (req.body.event === "payment.captured") {
      await Promise.all([
        EventPass.updateOne(
          { "paymentDetails.paymentID": paymentID },
          { "paymentDetails.captured": true, referralCode: notes.referralCode }
        ).exec(),
        Accomodation.updateOne({
          "paymentDetails.paymentID": paymentID,
          "paymentDetails.captured": true
        }).exec()
      ]);

      logger.info("Payment Captured for Event Pass");
    }
    return res.json({ status: "ok" });
  } catch (error) {
    logger.error(error);
    return mongooseErrorHandler(error, res);
  }
};

//const _verifyCouponValidity = async email => {
//  if (email.endsWith("@smail.iitm.ac.in")) {
//    return;
//  }
//  const allSummitIDs = await EventPass.distinct("summitID");
//  const bscCount = await User.find({
//    summitID: { $in: allSummitIDs },
//    email: {
//      $in: [/@student.onlinedegree.iitm.ac.in/, /@ds.study.iitm.ac.in/]
//    }
//  }).lean();
//  if (bscCount.length >= COUPON_LIMIT) {
//    const error = new Error("Coupon codes exhausted");
//    error.type = COUPON_EXHAUSTED;
//    throw error;
//  }
//  return;
//};
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns
 * Controller for buying passes with coupon codes
 * Do not use this when the user uses coupon code along with accomodation
 */

export const registerViaSmail = async (req, res) => {
  try {
    const { items } = req.body;
    const { summitID, email } = res.locals;
    if (!isSmail(email)) return res.status(400).json({ message: "No" });
    if (
      items.every(item =>
        [
          "Basic student pass",
          "Professional pass",
          "3 days + 2 nights accomodation",
          "4 days + 3 nights accomodation"
        ].includes(item.title)
      ) ||
      items.some(item => item.number > 1)
    ) {
      const error = new Error(
        "You can only avail a single student premium pass with coupon codes"
      );
      error.type = INVALID_CART_COUPON;
      throw error;
    }

    const newPass = new EventPass({
      summitID,
      pass: "PREMIUM_STUDENT_PASS",
      boughtBy: summitID,
      totalPrice: 0,
      couponCode: isSmail(email) ? "IITM_NORMAL" : "IITM_BSC",
      paymentDetails: {
        paymentID: "COUPON",
        captured: true
      }
    });
    await Promise.all([
      newPass.save(),
      User.updateOne({ summitID }, { registeredPass: "PREMIUM_STUDENT_PASS" })
    ]);

    return res.status(200).json({ message: "Transaction succesful" });
  } catch (err) {
    logger.error(err);
    return mongooseErrorHandler(err, res);
  }
};

export const verifyReferralCode = async (req, res) => {
  const { code } = req.query;
  try {
    await _verifyCAReferralCode(code);
    return res.status(200).json({ message: "successfully redeemed referral" });
  } catch (err) {
    return res
      .status(400)
      .json({ message: err?.response?.data?.message ?? "An error occured" });
  }
};
