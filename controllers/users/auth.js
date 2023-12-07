/* eslint-disable no-unused-vars */
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { User, Participant } from "#models";

import { logger, getSummitID, sendMail } from "#utils";

import {
  ESUMMIT_IITM_AUTH_TOKEN,
  ESUMMIT_IITM_USER,
  EVENTS,
  SOLO,
  TEAM
} from "#constants";

const ESUMMIT_SECRET = process.env.SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";


//setting cookies in user's PC locally.

const setCookies = (res, data) => {
  // eslint-disable-next-line no-unused-vars
  const { participatedEvents, ...forToken } = data;
  const token = jwt.sign(forToken, ESUMMIT_SECRET);

  //Secure the cookie (check if it was set with the domain mentioned and not locally)
  const opts = IS_PRODUCTION
    ? {
      domain: "es-wy7j.onrender.com",
    }
    : {};


  res.cookie(ESUMMIT_IITM_AUTH_TOKEN, token, {
    secure: IS_PRODUCTION, //It is just for adding an extra layer to the security
    httpOnly: false,
    ...opts
  });

  res.cookie(ESUMMIT_IITM_USER, JSON.stringify(data), {
    secure: IS_PRODUCTION,
    ...opts
  });
};

//Regstering the participants if it is a solo event.
const directSoloEventRegister = async (user, fromEvent) => {
  const participant = new Participant({
    user: user._id,
    event: fromEvent
  });
  await participant.save();

  //Sending welcome mail to the user when registered
  await sendMail(user.email, "event-welcome", {
    name: user.name,
    user: user.summitID,
    eventName: EVENTS[fromEvent].title
  });
  return true;
};

//Verification route
export const verifyAndSendMail = async (req, res) => {
  const email = req.query.to;

  try {
    const user = await User.find({ email: email.toLowerCase() }).exec();

    if (user.length !== 0) {
      res.status(400).json({
        message: `The email, ${email} is already associated with another account.`
      });
      return;
    }

    //Hashing the mail to be sent as verification code.
    const encryptedEmail = crypto
      .createHmac("sha1", process.env.EMAIL_SECRET)
      .update(email)
      .digest("hex")
      .substring(0, 6);

    console.log({ encryptedEmail });

    try {
      await sendMail(email, "email-verification", {
        verificationCode: encryptedEmail
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Mail coudn't be sent. Please try again tomorrow." });
    }

    return res.json({ message: "Verification Email sent" });
  } catch (error) {
    logger.error(error.message, error);
    res.status(500).json({ message: "An error occurred" });
  }
};

//Register Route
export const register = async (req, res) => {
  try {
    const { verificationCode } = req.body;

    //Encrypting user's email
    //Verification Code being sent to user is the mail he entered which is also encrypted using the same algorithm.
    const encryptedEmail = crypto
      .createHmac("sha1", process.env.EMAIL_SECRET)
      .update(req.body.email)
      .digest("hex")
      .substring(0, 6);

    console.log({ verificationCode, encryptedEmail, insideRegister: true });

    //Timing safe comparisons which provides a constant-time comparison that is not vulnerable to timing attacks
    const isVerified = crypto.timingSafeEqual(
      Buffer.from(encryptedEmail),
      Buffer.from(verificationCode)
    );

    //returning error code if the verification code provided is wrong.
    if (!isVerified) {
      const verificationError = new Error("Wrong verification code");
      verificationError.code = 400;
      throw verificationError;
    }

    //If registration for both esummit and events at the same type.
    const { fromEvent } = req.query;

    const notForEvent =
      !fromEvent ||
      fromEvent === "none" ||
      //We are not adding the event if for team because it will be handled in the registerforteam under events.js cause we should add the event to all the team members.
      EVENTS[fromEvent]?.type === TEAM;

    //creating new user
    const user = new User({
      ...req.body,
      email: req.body.email.toLowerCase(),
      password: await bcrypt.hash(req.body.password, 10),
      participatedEvents:
        notForEvent || EVENTS[fromEvent].type === SOLO ? [] : [fromEvent]
    });

    //Get E-Summit ID
    user.summitID = await getSummitID();
    await user.save();

    //distructuring the user to get the required details for putting cookies
    const { name, _id, email, summitID } = user.toObject();
    setCookies(res, {
      name,
      _id,
      email,
      summitID,
      participatedEvents: notForEvent ? [] : [fromEvent]
    });

    if (notForEvent) {
      //Sending a welcome mail after registering the user(if not a solo-event).
      await sendMail(email, "welcome", { name, summitID });
    }
    // else {
    //   await directSoloEventRegister(user, fromEvent);
    // }

    res.send({ summitID, name });
  } catch (error) {
    console.log("helloo");
    console.log(error.code);
    logger.error(error.message, error);

    //11000 means duplicate key error
    if (error.code === 11000) {
      //The "!!" operator is a shorthand for casting a value to a boolean.( Is truthy is is truthy (not equal to "null", "undefined", "0", "false", "NaN", or an empty string))
      const dupEmail = !!error.keyValue.email && error.keyValue.email;
      const dupPhone = !!error.keyValue.phone && error.keyValue.phone;
      const dupSummitID = !!error.keyValue.summitID && error.keyValue.summitID;
      console.log("HELLLOOO", dupEmail);
      console.log(dupPhone);

      if (dupEmail) {
        return res.status(400).json({
          message: `The email, ${dupEmail} is already associated to another registered account. Please use another email.`
        });
      }
      if (dupPhone) {
        console.log(dupPhone);
        return res.status(400).json({
          message: `The phone Number, ${dupPhone} is already associated to another registered account. Please use another number.`
        });
      }
      if (dupSummitID) {
        logger.error(
          `Duplicate ID ${dupSummitID} detected. Probably a result of race condition or random generation. Re-registering...`
        );
        await this.register(req, res);
      }
    }
    if (error.code === 400) {
      return res.status(400).send({ message: error.message });
    }
    return res.status(500).send({ message: error.message });
  }
};

//Login Route
export const login = async (req, res) => {
  if (!Object.keys(req.body).length) {
    return res.status(400).json({ message: "unauthorized" });
  }
  const { password } = req.body;
  const summitID = req.body.summitID.startsWith("ES23")
    ? req.body.summitID
    : "ES23" + req.body.summitID;

  if (!summitID) {
    return res.status(400).json({ message: "Please Enter your E-summit ID" });
  }

  if (!password) {
    return res.status(400).json({ message: "Please enter the password" });
  }

  try {
    const { fromEvent } = req.query;
    const user = await User.findOne({ summitID }).exec();

    if (!user) {
      return res
        .status(400)
        .json({ message: "No user was found with the given Summit ID." });
    }

    //password check
    const verifyPassword = await bcrypt.compare(password, user.password);

    if (!verifyPassword) {
      return res.status(401).json({ message: "The passwrod is incorrect." });
    }

    let newlyRegistered = false;

    //If the user was prompted to login while registering for a event(for which he haven't registered earlier).
    if (fromEvent !== "none" && EVENTS[fromEvent]?.type === SOLO) {
      if (!user.participatedEvents.includes(fromEvent)) {
        newlyRegistered = await directSoloEventRegister(user, fromEvent);
        user.participatedEvents.push(fromEvent);
        await user.save();
      }
    }

    const { name, _id, email, participatedEvents } = user.toObject();
    console.log(email);

    const a = setCookies(res, { name, _id, email, summitID, participatedEvents });

    console.log(a);
    return res.json({
      summitID: user.summitID,
      newlyRegistered,
      alreadyRegistered: user.participatedEvents.includes(fromEvent)
    });
  } catch (error) {
    res.status(500).json({ message: "An error occured" });
    logger.error(error.message, error);
  }
};

export const resetPasswordMail = async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email }).exec();
    console.log(email);

    if (!user) {
      res
        .status(400)
        .json({ message: "No account was found with the E-Mail." });
      return;
    }

    const pw = user.password;
    const code = crypto
      .createHash("md5")
      .update(pw)
      .digest("hex")
      .substring(0, 6);

    //send the code via mail
    try {
      await sendMail(email, "password-reset", {
        name: user.name,
        link: "https://portal.esummitiitm.org/login",
        code
      });
    } catch (error) {
      return res.status(500).json({ message: "An error occurred" });
    }
    res.json({ message: "E-Mail sent." });
  } catch (error) {
    logger.error(error.message, error);
    res.status(500).json({ message: "An error occurred" });
  }
};
export const resetPasswordFromCode = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email }).exec();

    if (!user) {
      res
        .status(400)
        .json({ message: "No account was found with the E-Mail." });
      return;
    }

    const pw = user.password;
    const codeFromUser = crypto
      .createHash("md5")
      .update(pw)
      .digest("hex")
      .substring(0, 6);

    const resetCode = crypto
      .createHash("md5")
      .update(pw)
      .digest("hex")
      .substring(0, 6); //creating the code with the same algorithm as in the resetPassworddMail controller above.

    const resetCodeCorrect = codeFromUser === resetCode;

    //changing the password if code was correct.
    if (resetCodeCorrect) {
      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = newHashedPassword;

      await user.save();
      res.json({ message: "Updated!" });
    } else {
      res.status(400).json({ message: "Reset code is incorrect" });
    }
  } catch (error) {
    logger.error(error.message, error);
    res.status(500).json({ message: "An error occurred" });
  }
};

/**
 * @type {import("express").Handler}
 */

//Logout
export const logout = async (req, res) => {
  try {
    const opts = IS_PRODUCTION
      ? {
        domain: "esummitiitm.org"
      }
      : {};

    //Clear all the Cookies that was set (Check the function directSoloEventRegister)
    res.clearCookie(ESUMMIT_IITM_AUTH_TOKEN, {
      secure: IS_PRODUCTION,
      httpOnly: true,
      ...opts
    });

    res.clearCookie(ESUMMIT_IITM_USER, {
      secure: IS_PRODUCTION,
      ...opts
    });
    res.json({ message: "Logged Out" });
  } catch (error) {
    if (error.code === 9090) {
      res.status(400).json({ message: "Unauthorized Request" });
    } else {
      logger.error(error.message, error);
      res.status(500).json({ message: "An error occured." });
    }
  }
};
