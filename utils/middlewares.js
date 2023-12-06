import jwt from "jsonwebtoken";
import bodyParser from "body-parser";

import { ESUMMIT_IITM_AUTH_TOKEN } from "./constants.js";
import logger from "./loggerUtils.js";

/**
 * @type {express.Handler}
 */
export const verifyRequest = (req, res, next) => {
  try {
    const payload = jwt.verify(
      req.cookies[ESUMMIT_IITM_AUTH_TOKEN],
      process.env.SECRET
    );
    res.locals = payload;
    return next();
  } catch (error) {
    logger.error(error.message, error);
    return res.status(400).send("Unauthorized Request");
  }
};

export const injectRawBody = bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
});
