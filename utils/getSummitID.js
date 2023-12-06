import { randomBytes } from "crypto";
import { User } from "../models/index.js";

/**
 *
 * @returns string
 * generates 4 random characters and returns it appended to ES23
 */
export const generateSummitID = () => {
  const PREFIX = "ES23";
  const summitID = PREFIX + randomBytes(2).toString("hex").toUpperCase();
  return summitID;
};

/**
 *
 * @returns string
 * returns a unique esummitID
 */
export const getSummitID = async () => {
  const currentSummitIDs = await User.distinct("summitID");
  /**
   *
   * @returns string
   * checks all the esummitIDs in the db, if the generated id is the same,regenerates, else returns the generated id
   */
  const getUnique = () => {
    const summitID = generateSummitID();
    if (currentSummitIDs.includes(summitID)) {
      return getUnique();
    }
    return summitID;
  };
  return getUnique();
};

export const getSummitIDsInBulk = async num => {
  const currentSummitIDs = await User.distinct("summitID");
  const summitIDs = new Set();
  while (summitIDs.size !== num) {
    const summitID = generateSummitID();
    if (!currentSummitIDs.includes(summitID)) {
      summitIDs.add(summitID);
    }
  }

  return [...summitIDs];
};

export default getSummitID;
