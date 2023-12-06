import { connectToMongoDB } from "#config";
import { injectRawBody, logger } from "#utils";
import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import apiRouter from "./routes/index.js";
import { eventPass, shop } from "#controllers";

const app = express();

const PORT = process.env.PORT || 5100;

const main = async () => {
  await connectToMongoDB();

  app.use(
    cors({
      credentials: true,
      origin: [
        /https?:\/\/localhost:\d{4}/,
        "https://esummitiitm.org",
        "https://portal.esummitiitm.org",
        "https://www.esummmitiitm.org",
        "https://passes.esummitiitm.org",
        "https://shop.esummitiitm.org",
        "https://esummit-iitm.netlify.app",
      ]
    })
  );

  app.post("/payment/capture/:type", injectRawBody, async (req, res) => {
    if (req.params.type === "passes") {
      logger.info("Whoaaa webhook has hit this route aaaaaahhhhh");
      await eventPass.capturePayment(req, res);
      return;
    }
    if (req.params.type === "shop") {
      logger.info("Shop webhook triggered");
      await shop.capturePayment(req, res);
      return;
    }

    res.status(400).end();
  });

  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  app.use(compression({ level: 9 }));
  app.use(
    helmet({
      referrerPolicy: {
        policy: "no-referrer-when-downgrade"
      }
    })
  );

  app.use("/", apiRouter);

  app.listen(PORT, () => {
    logger.info(`Express HTTP server running at ${PORT}`);
  });
};

main();
