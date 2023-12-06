import express from "express";
import userRoutes from "./user.js";
import eventRoutes from "./event.js";
import S3SignedPolicy from "../utils/S3SignedPolicy.js";
import logger from "../utils/loggerUtils.js";
// import shopRouter from "./shop.js";
import eventPassRouter from "./eventPass.js";
import shopRouter from "./shop.js";

const apiRouter = express.Router();

apiRouter.get("/", (_, res) => {
  return res.send("Look on my works, ye Mighty, and despair!!!!!!");
});
apiRouter.use("/user", userRoutes);
apiRouter.use("/event", eventRoutes);
apiRouter.get("/s3-signed-policy/:bucketName", (req, res) => {
  try {
    const signedPolicy = new S3SignedPolicy(req.params.bucketName);
    return res.json(signedPolicy);
  } catch (error) {
    logger.error(error.message, error);
    return res.status(
      500,
      "An error occurred. Please contact us or try again later."
    );
  }
});

apiRouter.use("/shop", shopRouter);
apiRouter.use("/passes", eventPassRouter);

export default apiRouter;
