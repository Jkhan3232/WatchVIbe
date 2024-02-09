import { Router } from "express";
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/get-commentsbyId/:videoId").get(getVideoComments);
router.route("/add-commentsbyId/:videoId").post(addComment);
router.route("/delete-commentbyId/:commentId").delete(deleteComment);
router.route("/update-commentbyId/:commentId").patch(updateComment);

export default router;
