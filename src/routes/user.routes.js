import { Router } from "express";
import { UserRolesEnum } from "../servers/constant.js"
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  verifyOTP,
  forgotPassword,
  resetPasswordWithOTP,
  verifyEmail,
  resendEmailVerification,
  assignRole
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewere.js";
import { verifyJWT, loginRateLimiter, verifyPermission } from "../middlewares/auth.middleware.js";
import { validate } from "../vaidators/validate.js";
import { mongoIdPathVariableValidator } from "../vaidators/mongoId.validate.js";
import {
  userAssignRoleValidator,
  userForgotPasswordValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userRegisterValidator,
  userResetForgottenPasswordValidator,
} from "../vaidators/user.validate.js";


const router = Router();

// Endpoint to register a new user
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  userRegisterValidator(), validate, registerUser
);
// Endpoint to log in a user
router.route("/login").post(userLoginValidator(), validate, loginUser);
router.route("/verifyotp").post(loginRateLimiter, verifyOTP);

// Endpoint to log out a user
router.route("/logout").post(verifyJWT, logoutUser);
// Endpoint to refresh access token
router.route("/refresh-token").post(refreshAccessToken);
// Endpoint to change user's current password
router.route("/change-password").post(verifyJWT, userChangeCurrentPasswordValidator(), validate, changeCurrentPassword);
// Endpoint to get current user details
router.route("/current-user").get(verifyJWT, getCurrentUser);
// Endpoint to update user's account details
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
// Endpoint to send reset password link to user's email
router.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPassword);
// Endpoint to reset user's password using the reset token
router.route("/reset-password").post(userResetForgottenPasswordValidator(), validate, resetPasswordWithOTP);
// Endpoint to sent verification link on email to verify email 
router.route("/verify-email/:verificationToken").get(verifyEmail);
// Endpoint to re-sent verification link on email to verify email 
router
  .route("/resend-email-verification")
  .post(verifyJWT, resendEmailVerification);


router.route("/asign-role/:userId")
  .post(
    verifyJWT,
    verifyPermission([UserRolesEnum.ADMIN]),
    mongoIdPathVariableValidator("userId"),
    userAssignRoleValidator(),
    validate,
    assignRole
  );

// Endpoint to update user's avatar
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
// Endpoint to update user's cover image
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

// Endpoint to get user's channel profile
router
  .route("/get-userchannel/:username")
  .get(verifyJWT, getUserChannelProfile);
// Endpoint to get user's watch history
router.route("/get-history").get(verifyJWT, getWatchHistory);

export default router;
