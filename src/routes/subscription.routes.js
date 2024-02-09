import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle-subscription/:channelId").post(toggleSubscription);
router.route("/get-subscriberbyid/:channelId").get(getUserChannelSubscribers);

router.route("/get-subscriptionbyid/:subscriberId").get(getSubscribedChannels);

export default router;
