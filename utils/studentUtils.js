import logger from "./loggerUtils.js";

export const isSmail = email => {
  logger.info({ email });
  return email?.endsWith("@smail.iitm.ac.in");
};
export const isBSCSmail = email =>
  ["@student.onlinedegree.iitm.ac.in", "@ds.study.iitm.ac.in"].some(
    emailSuffix => email?.endsWith(emailSuffix)
  );
