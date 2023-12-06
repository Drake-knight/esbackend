import mongoose from "mongoose";
import { EVENT_SLUGS } from "#constants";
const { ObjectId } = mongoose.Schema.Types;
const { Mixed } = mongoose.Schema.Types;

const participantSchema = new mongoose.Schema({
  event: {
    type: String,
    enum: EVENT_SLUGS
  },

  // The user in case of solo event
  // The team leader in case of team event
  user: {
    type: ObjectId,
    ref: "User",
    index: true
  },

  // The round at which the participant/team is in
  round: {
    type: Number,
    index: true,
    default: 0
  },

  // Submissions made by the participant/team
  submissions: {
    type: Array,
    of: {
      round: Number,
      submission: Mixed,
      timestamp: Date
    },
    default: {}
  },

  // Some events have a payment model
  // in which case, we need to save the payment ID
  paymentDetails: {
    paymentID: String,
    captured: Boolean
  },

  creationTime: { type: Date },
  lastUpdated: { type: Date }
});

participantSchema.pre("save", function (next) {
  this.creationTime = Date.now();
  next();
});

participantSchema.pre("updateOne", function (next) {
  this.lastUpdated = Date.now();
  next();
});

const TeamSpecificSchema = new mongoose.Schema({
  // There are externals IDs present when we import from D2C.
  // Not sure if we need them.
  externalTeamID: { type: String, unique: true, sparse: true, index: true },
  // The Team Name
  name: String,
  // Members
  members: {
    type: [ObjectId], // Including leader ID
    ref: "User"
  }
});

TeamSpecificSchema.statics.createTeam = async function createTeam(team) {
  const existingParticipant = await Participant.findOne({
    user: team.user,
    event: team.event
  });
  if (existingParticipant) {
    throw new Error("This leader already has registered for this event");
  }
  //eslint-disable-next-line no-unused-vars
  const newParticipant = new Team(team);
  console.log({ team });
  return newParticipant;
};

export const Participant = mongoose.model("Participant", participantSchema);
export const Team = Participant.discriminator(
  "ParticipantTeam",
  TeamSpecificSchema
);
