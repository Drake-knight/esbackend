import express from "express";
import { event } from "../controllers/index.js";
import { verifyRequest } from "#utils";

const eventRouter = express.Router();
eventRouter.post("/register/:slug", verifyRequest, event.register);
eventRouter.get("/order/create", event.createOrder);
eventRouter.post("/paymentVerification", event.paymentVerification);

export default eventRouter;
