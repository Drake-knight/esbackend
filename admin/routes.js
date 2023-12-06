import {
  getAccomodationInfo,
  //generateAdmins,
  getEventDetails,
  getEvents,
  getPassesInfo,
  login,
  promoteParticipants,
  updateEvent,
  checkIntoEvent
} from "./controllers.js";
import { Router } from "express";
import { verifyAdminRequest } from "./middleware.js";

const adminRouter = Router();

adminRouter.get("/", (req, res) => {
  res.send("Hey guys, whatcha doing?");
});
adminRouter.post("/login", login);
adminRouter.get("/events", verifyAdminRequest, getEvents);
adminRouter.get("/event/:slug", verifyAdminRequest, getEventDetails);
adminRouter.put("/event/:slug", verifyAdminRequest, updateEvent);
adminRouter.post("/promote/:slug", verifyAdminRequest, promoteParticipants);
adminRouter.get("/passes", verifyAdminRequest, getPassesInfo);
adminRouter.get("/accomodation", verifyAdminRequest, getAccomodationInfo);
adminRouter.post("/checkin/event", checkIntoEvent);
//adminRouter.get("/generate", generateAdmins);

export default adminRouter;
