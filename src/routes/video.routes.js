import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  uploadVideos,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middlewere.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/get-allvideos").get(getAllVideos);
router.route("/upload-video").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  uploadVideos
);

router.route("/get-videobyId/:videoId").get(getVideoById);
router
  .route("/update-videobyId/:videoId")
  .patch(upload.single("thumbnail"), updateVideo);
router.route("/delete-videobyId/:videoId").delete(deleteVideo);
router.route("/toggle-videobyId/:videoId").post(togglePublishStatus);

export default router;
