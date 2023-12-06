import mongoose from "mongoose";
import validator from "validator";
import { EVENT_PASS_ITEMS, EVENT_SLUGS } from "#constants";

function isStudent() {
  return this.type === "STUDENT";
}
function isStartupOwner() {
  return this.type === "FULL_TIME_ENT";
}
function isWorkingProfessional() {
  return this.type === "WORKING_PROFESSIONAL";
}
function isFromIITM() {
  return this.type === "STUDENT" && this?.study?.instituteName === "IIT Madras";
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  summitID: { type: String, unique: true, required: true },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: validator.isEmail,
      message: "{VALUE} is not an email",
      isAsync: false
    }
  },
  password: {
    type: String,
    required: true
  },
  avatar: { type: String },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: value => new RegExp(/^(\+\d{1,3} )?(\d+)$/g).test(value),
      message: "Invalid phone number",
      isAsync: false
    }
  },
  accomodationStatus: {
    type: String,
    enum: ["THREE_DAY_STAY", "FOUR_DAY_STAY"]
  },
  meta: {
    type: {
      type: String,
      enum: ["STUDENT", "FULL_TIME_ENT", "WORKING_PROFESSIONAL"]
    },
    linkedInURL: String,
    dob: String,
    study: {
      domain: { type: String, required: isStudent },
      instituteName: { type: String, required: isStudent },
      degree: { type: String, required: isStudent },
      branch: { type: String, required: isStudent },
      rollNo: { type: String, required: isFromIITM },
      yearOfPassing: { type: String, required: isStudent }
    },
    isStartupOwner: Boolean,
    startup: {
      startupName: { type: String, required: isStartupOwner },
      sector: { type: String, required: isStartupOwner },
      stage: { type: String, required: isStartupOwner },
      website: { type: String }
    },
    working: {
      organization: { type: String, required: isWorkingProfessional },
      role: { type: String, required: isWorkingProfessional },
      experience: { type: String, required: isWorkingProfessional },
      isMentorOrPotentialMentor: Boolean,
      previouslyMentoredStartups: Boolean,
      mentorshipDomain: [String],
      isPotentialInvestor: Boolean,
      hasInvestedBefore: Boolean,
      ticketSize: {
        type: String,
        required: function () {
          return this.meta.hasInvested;
        }
      },
      interestedDomains: {
        type: [String],
        enum: [
          "EdTech",
          "FinTech",
          "Sustainability",
          "HealthTech",
          "Sector Agnostic"
        ]
      }
    },
    address: {
      city: String,
      state: String
    }
  },

  participatedEvents: [
    {
      type: String,
      enum: EVENT_SLUGS
    }
  ],
  registeredPass: {
    type: String,
    enum: EVENT_PASS_ITEMS
  },
  checkedIn: [
    {
      type: String
    }
  ],
  creationTime: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

userSchema.pre("save", function (next) {
  const user = this;
  user.lastUpdated = Date.now();
  next();
});

userSchema.pre("updateOne", function (next) {
  const user = this;
  user.lastUpdated = Date.now();
  next();
});

export default mongoose.model("User", userSchema);
