import admin from "../models/admin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  ADMIN_SECRET,
  ESUMMIT_IITM_ADMIN_AUTH_TOKEN,
  IS_PRODUCTION
} from "../utils/constants.js";
import { logger } from "#utils";
import {
  Accomodation,
  Admin,
  Event,
  EventPass,
  MerchOrder,
  Participant,
  Team,
  User
} from "#models";
import crypto from "node:crypto";
import fs from "fs";

// const getObjectWithoutCertainKeys = obj => array =>
//  Object.keys(obj)
//    .filter(key => !array.includes(key))
//    .reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {});

export const login = async (req, res) => {
  const { email, password } = req.body;
  const adminInDB = await admin.findOne({ email }).lean().exec();
  console.log({ adminInDB });
  if (!adminInDB) {
    logger.info("NO ADMIN");
    return res.status(401).json({ message: "No admin found with this email" });
  }
  const isPasswordLegit = await bcrypt.compare(password, adminInDB.password);
  if (!isPasswordLegit) {
    logger.info("PASSWORD INCORRECT");
    return res.status(401).json({ message: "Incorrect Password" });
  }
  const token = jwt.sign(
    { id: adminInDB._id.toString(), scope: adminInDB.scope, email },
    ADMIN_SECRET
  );
  const opts = IS_PRODUCTION
    ? {
        domain: "esummitiitm.org"
      }
    : {};
  res.cookie(ESUMMIT_IITM_ADMIN_AUTH_TOKEN, token, {
    secure: IS_PRODUCTION,
    ...opts
  });
  res.cookie("ESUMMIT_IITM_ADMIN_LOGGED_IN", "cohenoor", {
    secure: IS_PRODUCTION,
    ...opts
  });
  return res.status(200).json({ message: "Login Successful" });
};

export const getEvents = async (req, res) => {
  const { id } = res.locals;
  logger.info({ id });
  const adminInDB = await admin.findById(id).lean().exec();
  console.log(adminInDB);
  if (!adminInDB) return res.status(401).json({ message: "Unauthorized" });
  // fetch all events with slugs in the scope: do a join with participants and the objects are stored in roundWise
  // match each participant to its corresponding event
  // will probably see a longer aggregate in 22 codebase(and that would be more performant cause more operations on the mongoCPU)
  // this is optimized for readability
  const events = await Event.aggregate([
    {
      $match: adminInDB.scope.includes("all")
        ? {}
        : { slug: { $in: adminInDB.scope } }
    },
    {
      $lookup: {
        from: "participants",
        as: "roundWise",
        let: { slug: "$slug" },
        pipeline: [
          {
            $match: { $expr: { $eq: ["$event", "$$slug"] } }
          }
        ]
      }
    }
  ]);
  const eventsWithRoundWiseStats = events.map(event => {
    const roundWiseStats = event.roundWise.reduce(
      (acc, participant) => {
        const round = participant.round;
        const submissions = participant.submissions;
        if (!acc[round]) {
          acc[round] = {};
          acc[round].participants = 0;
          acc[round].submissions = 0;
        }
        acc[round].participants += 1;
        acc[round].submissions += Object.values(submissions)?.find(
          submission => submission.round === round
        )
          ? 1
          : 0;
        return acc;
      },
      { 0: { participants: 0, submissions: 0 } }
    );
    event.roundWise = roundWiseStats;
    return event;
  });
  return res.status(200).json({ events: eventsWithRoundWiseStats });
};

export const getEventDetails = async (req, res) => {
  const { slug } = req.params;
  try {
    const eventDoc = await Event.findOne({ slug }).exec();
    if (eventDoc.isTeamEvent) {
      const teamDocs = await Team.find({ event: { $in: slug } })
        .populate("user", { name: 1, phone: 1, summitID: 1, email: 1, _id: 0 })
        .populate("members", { name: 1, summitID: 1, _id: 0 })
        .exec();

      const leanEvent = {
        slug,
        status: eventDoc.status,
        round: eventDoc.round,
        participants: teamDocs.map(teamDoc => {
          const members = teamDoc.members;
          return {
            _id: teamDoc._id,
            teamName: teamDoc.name,
            leader: teamDoc.user,
            members,
            round: teamDoc.round,
            submissions: [...Array(teamDoc.round + 1)].map(
              (_, indx) => teamDoc.submissions[indx]
            )
          };
        })
      };
      res.status(200).send(leanEvent);
    } else {
      const participantDocs = await Participant.find({ event: { $in: slug } })
        .populate("user", { name: 1, phone: 1, summitID: 1, email: 1, _id: 0 })
        .exec();
      const leanEvent = {
        slug,
        status: eventDoc.status,
        round: eventDoc.round,
        participants: participantDocs.map(participantDoc => {
          const { user, round, _id } = participantDoc.toObject();
          return {
            _id,
            ...user,
            round,
            submissions: [...Array(round + 1)].map(
              roundVal => participantDoc.submissions[roundVal]
            )
          };
        })
      };
      res.json(leanEvent);
    }
  } catch (err) {
    logger.error(err.message, err);
    res.status(500).send("An error occurred.");
  }
};

export const updateEvent = async (req, res) => {
  const { slug } = req.params;
  const { type } = req.query;
  console.log({ slug, type });

  if (!["round", "status"].includes(type)) {
    return res.status(401).send({ message: "nope" });
  }
  try {
    const updateBody = {};
    console.log({ body: req.body });
    updateBody[type] = req.body[type];
    await Event.updateOne({ slug }, { $set: { [type]: req.body[type] } });
    console.log("here");
    res.status(200).send({ message: "Updated" });
  } catch (err) {
    logger.error(err.message, err);
    res.status(500).send("An error occurred.");
  }
};

export const promoteParticipants = async (req, res) => {
  const _ids = req.body;
  try {
    await Participant.updateMany(
      { _id: { $in: _ids } },
      { $inc: { round: 1 } }
    );

    res.status(200).send({ message: "Updated" });
  } catch (err) {
    logger.error(err.message, err);
    res.status(500).send("An error occurred.");
  }
};

export const generateAdmins = async (req, res) => {
  const adminObjects = [
    {
      name: "Corporate Relations",
      email: "corporate_ecell@smail.iitm.ac.in",
      scope: []
    },
    {
      name: "Development and Association",
      email: "dna_ecell@smail.iitm.ac.in",
      scope: ["metrics"]
    },
    {
      name: "Editorial & Research",
      email: "editorial_ecell@smail.iitm.ac.in",
      scope: []
    },
    {
      name: "Entrepreneurship Club",
      email: "eclub@smail.iitm.ac.in",
      scope: [
        "invaso",
        "boardroom",
        "biz-quiz",
        "stocks-are-high",
        "idea-validation-meetup",
        "business-simulation-game",
        "e-awards",
        "e-lympics",
        "e-auction"
      ]
    },
    {
      name: "Events and Networking",
      email: "events_ecell@smail.iitm.ac.in",
      scope: ["bootcamp", "product-construct", "unconference"]
    },
    {
      name: "Finance and Operations",
      email: "finops_ecell@smail.iitm.ac.in",
      scope: []
    },
    {
      name: "Graphic Design and Media",
      email: "design_ecell@smail.iitm.ac.in",
      scope: []
    },
    {
      name: "Heads",
      email: "head_ecell@smail.iitm.ac.in",
      scope: ["all"]
    },
    {
      name: "Marketing and Public Relations",
      email: "pr_ecell@smail.iitm.ac.in",
      scope: ["all"]
    },
    {
      name: "Startup Services",
      email: "services_ecell@smail.iitm.ac.in",
      scope: ["elevate", "expert-edge", "startup-expo"]
    },
    {
      name: "Student Relations and Outreach",
      email: "sr_ecell@smail.iitm.ac.in",
      scope: []
    },
    {
      name: "Web & Mobile Operations",
      email: "webops_ecell@smail.iitm.ac.in",
      scope: ["all"]
    }
  ];
  const passwordEmailMap = {};
  for (const admin of adminObjects) {
    const passwordNonHashed = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(passwordNonHashed, 10);
    const adminDocument = new Admin({ ...admin, password: hashedPassword });
    await adminDocument.save();
    passwordEmailMap[adminDocument.email] = passwordNonHashed;
  }
  // write the password email map as a json in root, named adminPasswordInfo.json
  fs.writeFileSync("adminPasswordInfo.json", JSON.stringify(passwordEmailMap));
  res.status(200).send({ message: "Done" });
};

export const getPassesInfo = async (_, res) => {
  const passes = await EventPass.find({});
  const passesStatistics = passes.reduce(
    (acc, { pass, paymentDetails: { paymentID } }) => {
      if (paymentID === "finalist") {
        pass = "Finalist";
      }
      if (!acc[pass]) {
        acc[pass] = 1;
      } else {
        acc[pass] += 1;
      }
      return acc;
    },
    {}
  );
  const couponStatistics = passes.reduce((acc, { couponCode }) => {
    if (couponCode) {
      if (!acc[couponCode]) {
        acc[couponCode] = 1;
      } else {
        acc[couponCode] += 1;
      }
    }
    return acc;
  }, {});
  console.log(passesStatistics);
  return res.status(200).json({
    passesStatistics,
    couponStatistics
  });
};
export const getAccomodationInfo = async (_, res) => {
  const accomodations = await Accomodation.find({});
  const accomodationStatistics = accomodations.reduce(
    (acc, { accomodationType }) => {
      if (!acc[accomodationType]) {
        acc[accomodationType] = 1;
      } else {
        acc[accomodationType] += 1;
      }
      return acc;
    },
    {}
  );
  return res.status(200).json({
    accomodationStatistics
  });
};

export const getMerchInfo = async (_, res) => {
  try {
    const merchDataFromDB = await MerchOrder.find({});
    const merchStatistics = merchDataFromDB.reduce((acc, merchItem) => {
      const { singles, combos } = merchItem;
      singles.forEach(single => {
        if (!acc[single.key]) {
          acc[single.key] = 1;
        } else {
          acc[single.key] += 1;
        }
      });
      combos.forEach(combo => {
        if (!acc[combo.key]) {
          acc[combo.key] = 1;
        } else {
          acc[combo.key] += 1;
        }
      });
      return acc;
    }, {});
    return res.status(200).json({ merchStatistics });
  } catch (e) {
    logger.error(e.message, e);
    return res
      .status(400)
      .json({ message: "An error occured while fetching data" });
  }
};

export const checkIntoEvent = async (req, res) => {
  try {
    const { summitID, currentEvent } = req.body;
    const user = await User.findOne({ summitID });
    const eventPass = user.registeredPass;
    const eventPassInDB = await EventPass.findOne({ summitID });
    let isIITM = false;
    let status = "";
    if (["IITM_NORMAL", "IITM_BSC"].includes(eventPassInDB?.couponCode)) {
      isIITM = true;
      status = "Kindly show your ID Card";
    }
    if (!user) {
      return res.status(400).send({ status: "Invalid QR code, check again" });
    }

    if (user.checkedIn?.includes(currentEvent)) {
      return res.status(200).send({
        name: user.name,
        pass: eventPass ?? "No pass",
        status: "Already checked in to event"
      });
    }
    if (!isIITM && !eventPass) {
      status = "You dont have a pass";
    }

    user.checkedIn = user.checkedIn
      ? [...user.checkedIn, currentEvent]
      : [currentEvent];
    const result = {
      name: user.name,
      pass: eventPass ?? "No pass",
      status
    };
    await user.save();

    console.log(result);
    return res.status(200).send(result);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
