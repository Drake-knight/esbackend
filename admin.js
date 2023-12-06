import { connectToMongoDB } from "#config";
import adminRouter from "./admin/routes.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";

const app = express();
const PORT = process.env.ADMIN_PORT || 5300;
const main = async () => {
  await connectToMongoDB();
  app.use(
    cors({
      credentials: true,
      origin: ["http://localhost:3000", "https://admin.esummitiitm.org", "https://esummit-iitm.netlify.app", "https://esss.netlify.app",]
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(
    express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
  );
  app.use(compression({ level: 9 }));
  app.use(
    helmet({
      referrerPolicy: {
        policy: "no-referrer-when-downgrade"
      }
    })
  );

  app.use("/admin", adminRouter);
  app.listen(PORT, () => {
    console.log(`Admin server running at ${PORT}`);
  });
};

main();
