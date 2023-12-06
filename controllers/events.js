import { ESUMMIT_IITM_USER, EVENTS, SOLO } from "#constants";
import { Participant, Team, User } from "#models";
import { logger, toSentenceCase } from "#utils";
import crypto from "crypto";
import Razorpay from "razorpay";
// const Razorpay = require("razorpay");
import { UserType, InvestorDetails, StartupDetails } from "../models/zod.js";

const paymentRzp =
  process.env.NODE_ENV === "production"
    ? new Razorpay({
        key_id: process.env.RAZORPAY_PASSES_LIVE_KEY_ID,
        key_secret: process.env.RAZORPAY_PASSES_LIVE_KEY_SECRET
      })
    : new Razorpay({
        key_id: process.env.RAZORPAY_PASSES_TEST_KEY_ID,
        key_secret: process.env.RAZORPAY_PASSES_TEST_KEY_SECRET
      });

const closedRegistrations = ["bootcamp", "yes"];

export const registerSolo = async (user, eventSlug, submission) => {
  if (user.participatedEvents.includes(eventSlug)) {
    const err = new Error("You have already registered for this event.");
    err.code = 400;
    throw err;
  }
  if (eventSlug === "investinder") {
    let result = UserType.safeParse(submission.userType);
    if (submission.userType === "STARTUP") {
      result = StartupDetails.safeParse(submission.userDetails);
    } else if (submission.userType === "INVESTOR") {
      result = InvestorDetails.safeParse(submission.userDetails);
    }
    if (!result.success) {
      // console.log(result.error.issues[0].message);
      const err = new Error(result.error.issues[0].message);
      err.code = 400;
      throw err;
    }
  }
  // const submissions = new Map();
  // ! If you are making a solo event, and there is some event specific data that you collect in round 1, add your submission here, the third argument to this function will be an object with a property submission
  const participant = new Participant({
    event: eventSlug,
    user: user._id,
    submissions: { round: 0, submission },
    round: 0
  });

  await participant.save();
  user.participatedEvents.push(eventSlug);
  await user.save();
  return true;
};

export const registerTeam = async (
  { submission },
  team,
  leaderID,
  eventSlug,
  paymentDetails
) => {
  const members = await User.find(
    { summitID: { $in: team.members } },
    { _id: 1, participatedEvents: 1 }
  ).exec();
  console.log({ members });
  if (team.members) {
    if (members.length !== team.members?.length) {
      const err = new Error("Members not found");
      err.code = 400;
      logger.error("mem error", members, team);
      throw err;
    }
  }
  if (members.some(doc => doc.participatedEvents.includes(eventSlug))) {
    const err = new Error(
      "Looks like some of these summit IDs are already registered for this event. Please ensure that this is not the case."
    );
    err.code = 400;
    throw err;
  }
  console.log({
    event: eventSlug,
    name: team.name,
    user: leaderID,
    members: members.map(doc => doc._id),
    paymentDetails,
    submissions: {
      round: 0,
      submission
    },
    round: 0
  });
  const teamDoc = await Team.createTeam({
    event: eventSlug,
    name: team.name,
    user: leaderID,
    members: members.map(doc => doc._id),
    paymentDetails,
    submissions: {
      round: 0,
      submission
    },
    round: ["solve-to-evolve", "strategize"].includes(eventSlug) ? 1 : 0
  });
  // console.log(teamDoc);
  await Promise.all([
    teamDoc.save(),
    User.updateMany(
      { _id: { $in: [leaderID, ...members.map(doc => doc._id)] } },
      {
        $addToSet: { participatedEvents: eventSlug }
      }
    )
  ]);
};

/**
 * @type {import("express").Handler}
 */
export const register = async (req, res) => {
  const { slug: eventSlug } = req.params;
  if (closedRegistrations.includes(eventSlug)) {
    return res.status(401).send("This event is closed");
  }
  const submission = req.body.submission;
  try {
    if (EVENTS[eventSlug].type === SOLO) {
      const user = await User.findById(res.locals._id);

      console.log(eventSlug);
      await registerSolo(user, eventSlug, submission);
      console.log({ submission });
    } else if (eventSlug === "bootcamp") {
      await registerTeam(
        {
          submission: {
            ...submission,
            startupName: req.body.team.name,
            founderBackground: req.body.founderBackground,
            founderAge: req.body.founderAge,
            founderGraduateYear: req.body.founderGraduateYear,
            founderIsStudent: req.body.founderIsStudent
          }
        },
        req.body.team,
        res.locals._id,
        eventSlug
      );
    } else {
      console.log(req.body);
      await registerTeam(
        { submission },
        req.body.team,
        res.locals._id,
        eventSlug,
        req.body.paymentDetails
      );
    }
    const currentUser = JSON.parse(req.cookies[ESUMMIT_IITM_USER]);
    const opts =
      process.env.NODE_ENV === "production"
        ? { domain: "esummitiitm.org" }
        : {};

    res.cookie(
      ESUMMIT_IITM_USER,
      JSON.stringify({
        ...currentUser,
        participatedEvents: [...currentUser.participatedEvents, eventSlug]
      }),
      opts
    );
    return res.json({ title: EVENTS[eventSlug].title });
  } catch (err) {
    logger.error(err.message, err);
    if (err.code) {
      return res.status(err.code).json({ message: err.message });
    }
    return res.status(500).send("An error occurred");
  }
};

// console.log(process.env.RAZORPAY_PASSES_LIVE_KEY_ID);
export const createOrder = async (req, res) => {
  const eventName = toSentenceCase(req.query.event);
  const leaderID = req.query.leaderID;

  const options = {
    amount: 199 * 100,
    currency: "INR"
  };
  const order = await paymentRzp.orders.create(options);

  if (order) {
    const leader = await User.findOne({ summitID: leaderID }).exec();
    console.log(leader);
    if (!leader) {
      throw Error("leader not found");
    }
    const orderOptions = {
      key: order.key,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      notes: order.notes,

      name: eventName,
      description: "Registration fee",
      theme: { color: "#222222" },
      prefill: {
        leaderEmail: leader.email,
        leaderPhone: leader.phone
      }
    };
    console.info("Order generated", order.id);
    res.status(200).json(orderOptions);
  } else {
    res.status(401).json({ error: "Subscription could not be added" });
  }
};

export const paymentVerification = async (req, res) => {
  console.log("payment verification req.body", req.body);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_PASSES_TEST_KEY_SECRET)
    .update(body.toString())
    .digest("hex");
  // console.log(expectedSignature, razorpay_signature);

  if (expectedSignature === razorpay_signature) {
    console.log("request is legit");

    res.status(200).json({
      success: true
    });
  } else {
    res.status(401).json({
      failure: true
    });
  }
};
