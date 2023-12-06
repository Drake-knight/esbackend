import jwt from "jsonwebtoken";

export const verifyAdminRequest = async (req, res, next) => {
  console.log({ cookies: req.cookies.ESUMMIT_IITM_ADMIN_AUTH_TOKEN });
  if (!(req.cookies?.ESUMMIT_IITM_ADMIN_LOGGED_IN === "cohenoor")) {
    return res.status(401).json({ message: "unauthorized" });
  }
  console.log(process.env.ADMIN_SECRET);
  const payload = jwt.verify(
    req.cookies.ESUMMIT_IITM_ADMIN_AUTH_TOKEN,
    process.env.ADMIN_SECRET
  );
  res.locals = payload;
  next();
};
