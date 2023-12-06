// Code that requests the E-Cell API
import axios from "axios";
import logger from "./loggerUtils.js";

const url =
  process.env.NODE_ENV === "production"
    ? "https://ecell.iitm.ac.in/data/cap"
    : "http://localhost:5000/data/cap"; //API-backend server

export const _verifyCAReferralCode = async referralCode => {
  try {
    const verifyCode = await axios.get(
      `${url}/esummit/verify?code=${referralCode}`
    );
    if (verifyCode.status === 200) return verifyCode;
  } catch (error) {
    logger.error(error.message);
    error.type = "REFERRAL_CODE_INVALID";
    throw error;
  }
};

/**
 * @param {"merch"|"passes"} type
 * @param {String} referralCode
 */
export const _incrementCACount = async (type, referralCode, summitID) => {
  try {
    if (!referralCode) return;
    const caUserUpdate = await axios.post(`${url}/user/increase-count`, {
      referralCode,
      type,
      summitID
    });
    return caUserUpdate;
  } catch (error) {
    let err = new Error(error?.response?.data?.message);
    throw err;
  }
};
