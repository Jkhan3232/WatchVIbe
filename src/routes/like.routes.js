import { Router } from "express";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleVideoLike,
  toggleTweetLike,
} from "../controllers/like.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle-like/v/:videoId").post(toggleVideoLike);
router.route("/toggle-commentlike/c/:commentId").post(toggleCommentLike);
router.route("/toggle-tweetlike/t/:tweetId").post(toggleTweetLike);
router.route("/get-like/videos").get(getLikedVideos);

export default router;
