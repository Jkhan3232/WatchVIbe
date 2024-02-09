import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create-playlistbyid/:videoId").post(createPlaylist);
router.route("/get-playlistbyuserId/:userId").get(getUserPlaylists);
router.route("/get-playlistbyId/:playlistId").get(getPlaylistById);
router.route("/update-playlistbyId/:playlistId").patch(updatePlaylist);
router.route("/delete-playlistbyId/:playlistId").delete(deletePlaylist);
router
  .route("/add-videos-to-playlistbyId/:playlistId/:videoId")
  .patch(addVideoToPlaylist);
router
  .route("/remove-videos-to-playlistbyId/:playlistId/:videoId")
  .patch(removeVideoFromPlaylist);

export default router;
