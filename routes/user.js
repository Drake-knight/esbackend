import express from "express";
import { user } from "../controllers/index.js";
import { verifyRequest } from "#utils";
const userRouter = express.Router();

userRouter.post("/login", user.login);
userRouter.post("/register", user.register);
// userRouter.post("/auth/google", user.googleAuth);
userRouter.get("/verify", user.verifyAndSendMail);
userRouter.get("/check-user/:by", user.checkUser);
userRouter.get("/registered-passes", verifyRequest, user.registeredPasses);

userRouter.put("/onboarding", verifyRequest, user.onboardingRoute);

userRouter.get("/profile", verifyRequest, user.getDetails);
userRouter.get("/ticket", verifyRequest, user.getTicketDetails);

userRouter.get("/events", verifyRequest, user.getEvents);
userRouter.put("/submit/:event/:round", verifyRequest, user.submitRound);

userRouter.get("/workshops", verifyRequest, user.getWorkshops);
userRouter.get("/logout", verifyRequest, user.logout);
userRouter.get("/event-details/:slug", verifyRequest, user.getEventDetails);
userRouter.get("/pw-reset-mail", user.resetPasswordMail);
userRouter.get(
  "/event-participants",
  verifyRequest,
  user.getInvestinderParticipants
);
userRouter.put(
  "/investinder-checklist",
  verifyRequest,
  user.updateInvestinderChecklist
);
userRouter.post("/reset-password", user.resetPasswordFromCode);
// userRouter.post("/onetime", user.oneTimeLoginReset);
userRouter.put("/update/:type", verifyRequest, user.updateUser);
export default userRouter;
