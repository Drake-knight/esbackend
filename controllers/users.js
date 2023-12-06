import bcrypt from "bcrypt";

import { User, Workshop, Participant, Team, Event, EventPass } from "#models";

import { logger } from "#utils";
import { ESUMMIT_IITM_USER, EVENTS, SOLO } from "#constants";
import mongoose from "mongoose";

const getSubmissions = async (eventDoc, _id) => {
  // ! route most likely won't work cause for solo events , query should be for user and not for members
  const participant = await (eventDoc.isTeamEvent ? Team : Participant)
    .findOne({
      ...(!eventDoc.isTeamEvent
        ? { $or: [{ user: _id }, { members: _id }] }
        : { members: _id }),
      event: eventDoc.slug
    })
    .exec();
  // console.log({ participant });
  if (!participant || participant.submissions.size === 0) return false;
  return participant.submissions;
};

//User check
export const checkUser = async (req, res) => {
  try {
    switch (req.params.by) {
      case "email": {
        const user = await User.findOne({ email: req.query.email }).exec();

        return res.send(user == null ? "true" : "false");
      }
      case "summitID": {
        let { summitID } = req.query;
        summitID =
          summitID.startsWith("ES23") && summitID.length === 8
            ? summitID
            : `ES23${summitID}`;
        const user = await User.findOne({ summitID }).exec();

        return res.send(user == null ? "false" : "true");
      }
      case "phone": {
        const user = await User.findOne({
          phone: req.query.phone.toString()
        }).exec();
        return res.send(user == null ? "true" : "false");
      }
      case "eventPass": {
        const { ESUMMIT_IITM_USER } = req.cookies;
        if (!ESUMMIT_IITM_USER.accessPassAvailed) {
          const accessPassAvailed = await EventPass.exists({
            summitID: ESUMMIT_IITM_USER.summitID
          });
          return res.send(accessPassAvailed);
        }
      }
    }
  } catch (error) {
    logger.error(error.message, error);
  }
};

export const getDetails = async (req, res) => {
  try {
    const { _id } = JSON.parse(req.cookies[ESUMMIT_IITM_USER]);
    const user = (await User.findById(_id).exec()).toObject();
    delete user.password;
    delete user.creationTime;
    delete user.lastUpdated;
    delete user.participatedEvents;

    return res.send(user);
  } catch (error) {
    logger.error(error.message, error.stack);
    return res.status(500).send("An error occurred.");
  }
};

export const getTicketDetails = async (req, res) => {
  try {
    const id = req.query.id;

    const { name, summitID } = await User.findOne({ summitID: id }).exec();

    return res.send({ name, summitID });
  } catch (error) {
    logger.error(error.message, error);
    return res.status(500).send("An error occurred.");
  }
};

export const getEvents = async (req, res) => {
  try {
    const user = await User.findById(res.locals._id).exec();
    if (!user) {
      return res.status(400).send("User not found");
    }
    const { participatedEvents } = user.toObject();

    const events = await Event.find({
      slug: { $in: participatedEvents }
    }).exec();
    const leanEvents = events.map(async eventDoc => {
      const submissions = await getSubmissions(eventDoc, res.locals._id);
      // console.log(eventDoc);
      const leanEvent = {
        ...eventDoc.toObject(),
        //have a look into it please(Rvish)

        submissionStatus:
          submissions &&
          submissions.filter(element => {
            element.round === eventDoc.round;
          })
      };
      // console.log(
      //   submissions.filter(element => {
      //     element.round === eventDoc.round;
      //   })
      // );
      return leanEvent;
    });

    return res.json(await Promise.all(leanEvents));
  } catch (error) {
    res.status(500).send("An error occurred");
    logger.error(error.message, error);
  }
};

export const getEventDetails = async (req, res) => {
  const { slug } = req.params;
  try {
    const eventDoc = await Event.findOne({ slug }).exec();

    if (eventDoc.isTeamEvent) {
      const teamDoc = await Team.findOne({
        members: res.locals._id,
        event: slug
      }).exec();
      const { user: leaderID, members } = teamDoc;

      const allMembers = await User.find({ _id: { $in: members } }).exec();

      const restMemberNames = allMembers
        .filter(({ _id }) => !leaderID.equals(_id))
        .map(({ name }) => name);

      const details = {
        participant: {
          name: teamDoc.name,
          leader: {
            _id: leaderID,
            name: allMembers.find(({ _id }) => leaderID.equals(_id)).name
          },
          members: restMemberNames,
          round: teamDoc.round,
          submissions: teamDoc.submissions
        },
        event: {
          status: eventDoc.status === "ACCEPTING_SUBMISSIONS",
          round: eventDoc.round,
          isTeamEvent: true
        }
      };
      res.json(details);
    } else {
      const participantDoc = await Participant.findOne({
        user: res.locals._id,
        event: slug
      }).exec();

      const details = {
        participant: {
          round: participantDoc.round,
          submissions: participantDoc.submissions
        },
        event: {
          status: eventDoc.status === "ACCEPTING_SUBMISSIONS",
          round: eventDoc.round,
          isTeamEvent: false
        }
      };
      res.json(details);
    }
  } catch (error) {
    logger.error(error.message, error);
    res.status(500).send(error.message);
  }
};

export const getInvestinderParticipants = async (req, res) => {
  try {
    const { _id: id } = res.locals;
    const data = await Participant.find({ event: "investinder" });
    const userArr = data.filter(
      participant => participant.user.toString() === id
    );
    if (userArr.length === 0)
      throw Error("User not registered for investinder");
    const user = userArr[0];
    const userChecklist =
      user.submissions.length > 1
        ? user.submissions[1].submission.checklist
        : [];
    const filteredData = data
      .filter(participant => {
        return (
          participant.user.toString() !== id &&
          participant.submissions[0].submission.userType !==
            user.submissions[0].submission.userType
        );
      })
      .map(participant => {
        return {
          ...participant.submissions[0].submission,
          user: participant.user.toString()
        };
      });
    return res.status(200).send({ filteredData, checklist: userChecklist });
  } catch (error) {
    console.error(error);
    return res.status(500).send(error.message);
  }
};

export const submitRound = async (req, res) => {
  try {
    const { event, round } = req.params;
    const timestamp = Date.now();
    if (typeof round !== "number" && round > 3) {
      // shaky test to avoid script kiddies from crashing the server
      return res.status(400).json({ message: "Huh you wish" });
    }

    const participant = await (EVENTS[event].type === SOLO ? Participant : Team)
      .findOne({ event, user: res.locals._id })
      .exec();

    participant.submissions[round] = {
      submission: {
        ...(participant.submissions?.[round]?.submission || {}),
        ...req.body
      },
      round,
      timestamp
    };

    await participant.save();

    return res.json({ timestamp });
  } catch (error) {
    res.status(500).send("Ann error occurred");
    logger.error(error.message, error);
  }
};

export const updateUser = async (req, res) => {
  const { type } = req.params;

  try {
    const { _id: userID } = res.locals;

    if (type === "info") {
      try {
        const dataToUpdate = req.body;

        await User.updateOne({ _id: userID }, dataToUpdate).exec();

        res.send("data update");
      } catch (error) {
        if (error.code === 11000) {
          let duplicate = Object.getOwnPropertyNames(error.keyValue)[0];
          res
            .status(400)
            .send(
              `This ${
                duplicate == "phone" ? "Contact No." : "E-Mail ID"
              } is already associated to another account.`
            );
        } else {
          logger.error(error.message, error);
          res.status(500).send(error.message ? error.message : error);
        }
      }
    }

    if (type === "password") {
      try {
        const { currentPassword, newPassword } = req.body;

        const userDoc = await User.findById(userID);

        let credentialsCorrect = await bcrypt.compare(
          currentPassword,
          userDoc.password
        );

        if (credentialsCorrect) {
          let hashedPassword = await bcrypt.hash(newPassword, 10);

          userDoc.password = hashedPassword;
          await userDoc.save();

          res.send("Successfully changed password.");
        } else {
          res
            .status(400)
            .send(
              "The current passsword you entered is wrong. Please ensure you've entered the correct password."
            );
        }
      } catch (error) {
        logger.error(error.message, error);
        res.status(500).send(error.message ? error.message : error);
      }
    }
    if (type === "avatar") {
      try {
        const { avatar } = req.body;
        await User.findByIdAndUpdate(userID, { avatar }).exec();

        return res.send("Avatar updated");
      } catch (error) {
        logger.error(error.message, error);
        res.status(500).send(error.message ? error.message : error);
      }
    }
  } catch (error) {
    logger.error(error.message, error);
    if (error.message === "Not authorized") {
      res.status(401).send(error.message);
      return;
    }
    res.status(500).end();
  }
};

export const getWorkshops = async (req, res) => {
  try {
    const userDoc = await User.findOne({
      summitID: res.locals.summitID
    }).exec();

    if (userDoc.registeredWorkshops) {
      const workshopDocs = await Workshop.find({
        key: { $in: userDoc.registeredWorkshops }
      }).exec();
      const leanWorkshops = workshopDocs.map(({ topic, date, sponsor }) => ({
        topic,
        date,
        sponsor
      }));

      res.send(leanWorkshops);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.status(500).end();
    logger.error(error.message, error);
  }
};

export const onboardingRoute = async (req, res) => {
  try {
    const modObject = { meta: req.body };
    const email = JSON.parse(req.cookies[ESUMMIT_IITM_USER]).email;
    const updatedUser = await User.updateOne({ email }, modObject);
    res.status(200).send({ user: updatedUser, msg: "Updation succesful" });
  } catch (err) {
    logger.error(err.message, err);
    res.status(500).send("An error occured");
  }
};

export const registeredPasses = async (req, res) => {
  try {
    const { registeredPass } = await User.findById(res.locals._id).lean();
    res.status(200).json({ registeredPass });
  } catch (error) {
    logger.error(error.message);
    res.status(500).send("An error occured");
  }
};

export const updateInvestinderChecklist = async (req, res) => {
  try {
    const { _id } = res.locals;
    const { checklist } = req.body;
    const id = mongoose.Types.ObjectId(_id);
    const user = await Participant.findOne({ user: id });
    const submissionObject =
      user.submissions.length > 1
        ? user.submissions[1]
        : { round: 1, submission: { checklist: [] } };

    const temp = [];
    for (const key of Object.keys(checklist)) {
      temp.push(mongoose.Types.ObjectId(key));
    }
    submissionObject.submission.checklist = temp;
    if (user.submissions.length === 1) {
      user.submissions.push(submissionObject);
    } else {
      user.submissions[1] = submissionObject;
    }
    await user.save();
    res.status(200).send({ success: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("An error occurred");
  }
};

export * from "./users/auth.js";
