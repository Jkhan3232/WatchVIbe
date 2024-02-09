import { asyncHandler } from "../utils/AsyncHandaler.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { options } from "../utils/JWT_option.js";
import { generateAccessAndRefereshTokens } from "../utils/JWT.token.js";
import { sendOTP, otpGenerator, sendEmail, emailVerificationMailgenContent } from "../utils/SmtpValidation.js";
import mongoose from "mongoose";
import { UserLoginType, UserRolesEnum } from "../servers/constant.js";

// Endpoint to register a new user
const registerUser = asyncHandler(async (req, res) => {
  try {
    // Destructure fullName, email, username, and password from request body
    const { fullName, email, username, password, role } = req.body;

    // Check if any of the fields are empty
    if (
      [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
      throw new ApiError(400, "All fields are required");
    }

    // Check if the user with the provided email or username already exists
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
      throw new ApiError(409, "User with email or username already exists");
    }

    // Initialize variables for avatar and cover image local paths
    let avatarLocalPath, coverImageLocalPath;
    if (req.files) {
      if (
        req.files.avatar &&
        Array.isArray(req.files.avatar) &&
        req.files.avatar.length > 0
      ) {
        avatarLocalPath = req.files?.avatar[0]?.path;
      }
      if (
        req.files.coverImage &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
      ) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
      }
    }

    // Check if avatar file is provided
    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required");
    }

    // Upload avatar to Cloudinary and handle errors
    const avatar = avatarLocalPath
      ? await uploadOnCloudinary(avatarLocalPath, username)
      : null;
    if (!avatar || !avatar.url) {
      throw new ApiError(500, "Failed to upload avatar");
    }

    // Upload cover image to Cloudinary and handle errors
    const coverImage = coverImageLocalPath
      ? await uploadOnCloudinary(coverImageLocalPath, username)
      : null;

    if (!coverImage || !coverImage.url) {
      throw new ApiError(500, "Failed to upload cover image");
    }

    // Create a new user with the provided details
    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage ? coverImage.url : "",
      email,
      password,
      username: username.toLowerCase(),
      isEmailVerified: false,
      role: role || UserRolesEnum.USER,
    });


    /**
     * unHashedToken: unHashed token is something we will send to the user's mail
     * hashedToken: we will keep record of hashedToken to validate the unHashedToken in verify email controller
     * tokenExpiry: Expiry to be checked before validating the incoming token
     */
    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();

    /**
     * assign hashedToken and tokenExpiry in DB till user clicks on email verification link
     * The email verification is handled by {@link verifyEmail}
     */
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email: user?.email,
      subject: "Please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get(
          "host"
        )}/api/v1/users/verify-email/${unHashedToken}`
      ),
    });


    // Find the created user and remove sensitive information before sending the response
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -otp"
    );
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user");
    }


    // Return a success response with the created user details
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered successfully"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});


// Login endPoint
const loginUser = asyncHandler(async (req, res) => {
  try {
    // Destructure email, username, and password from request body
    const { email, username, password } = req.body;

    // Check if either email or username is provided
    if (!email && !username) {
      throw new ApiError(400, "Please provide either username or email");
    }

    // Check required fileds fill or not
    if (!email || !password) {
      throw new ApiError(400, "Please fill all required fields");
    }

    // Find the user with the provided email or username
    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    // If user does not exist, throw an error
    if (!user) {
      throw new ApiError(404, "User not found. Please check your credentials");
    }
    if (user.loginType !== UserLoginType.EMAIL_PASSWORD) {
      // If user is registered with some other method, we will ask him/her to use the same method as registered.
      // This shows that if user is registered with methods other than email password, he/she will not be able to login with password. Which makes password field redundant for the SSO
      throw new ApiError(
        400,
        "You have previously registered using " +
        user.loginType?.toLowerCase() +
        ". Please use the " +
        user.loginType?.toLowerCase() +
        " login option to access your account."
      );
    }

    // Check password is correct or not
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials");
    }

    // Generate OTP using otpGenerator function
    const otp = otpGenerator();

    // Save the generated OTP to the user object
    user.otp = otp;
    await user.save();

    // Send the generated OTP to the user's email
    await sendOTP({ email, otp, type: "login" });

    // Return a success response with the generated OTP
    return res
      .status(200)
      .json(new ApiResponse(200, { otp: otp }, "OTP sent successfully"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});


// Function to verify OTP
const verifyOTP = asyncHandler(async (req, res) => {
  try {
    // Destructure OTP from request body
    const { otp } = req.body;

    // If OTP is not provided, throw an error
    if (!otp) {
      throw new ApiError(400, "OTP is required");
    }

    // Find the user with the provided OTP
    const user = await User.findOne({ otp });

    // If user does not exist or OTP doesn't match, throw an error
    if (!user || user.otp !== otp) {
      throw new ApiError(401, "Invalid OTP");
    }

    // Clear OTP from user object
    user.otp = null;
    await user.save();

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken -otp -isEmailVerified"
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged in successfully"
        )
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});


const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const { verificationToken } = req.params;

    if (!verificationToken) {
      throw new ApiError(400, "Email verification token is missing");
    }

    // generate a hash from the token that we are receiving
    let hashedToken = CryptoJS.SHA256(verificationToken).toString();

    // While registering the user, same time when we are sending the verification mail
    // we have saved a hashed value of the original email verification token in the db
    // We will try to find user with the hashed token generated by received token
    // If we find the user another check is if token expiry of that token is greater than current time if not that means it is expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(489, "Token is invalid or expired");
    }

    // If we found the user that means the token is valid
    // Now we can remove the associated email token and expiry date as we no longer need them
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    // Turn the email verified flag to `true`
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// This controller is called when a user is logged in and he has a snackbar that your email is not verified
// In case he did not get the email or the email verification token is expired
// he will be able to resend the token while he is logged in
const resendEmailVerification = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      throw new ApiError(404, "User does not exist", []);
    }

    // if email is already verified throw an error
    if (user.isEmailVerified) {
      throw new ApiError(409, "Email is already verified!");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken(); // generate email verification creds

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email: user?.email,
      subject: "Please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get(
          "host"
        )}/api/v1/users/verify-email/${unHashedToken}`
      ),
    });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Mail has been sent to your mail ID"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Endpoint to log out a user
const logoutUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { refreshToken: 1 } }, // Unset the refresh token field
      { new: true }
    );
    if (!user) {
      throw new ApiError(404, "User does not exist");
    }

    return res
      .status(200)
      .clearCookie("accessToken", options) // Clear the access token cookie
      .clearCookie("refreshToken", options) // Clear the refresh token cookie
      .json(new ApiResponse(200, { user: user.username }, "User logged Out"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Endpoint to refresh access token using refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    // Extract the refresh token from cookies or request body
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      // If refresh token is missing, send a 401 Unauthorized error
      throw new ApiError(401, "Unauthorized request: Refresh token is missing");
    }

    // Verify the incoming refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user by ID from the decoded token
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      // If user not found, send a 401 Unauthorized error
      throw new ApiError(401, "Invalid refresh token: User not found");
    }

    // Check if the incoming refresh token matches the user's refresh token
    if (incomingRefreshToken !== user?.refreshToken) {
      // If refresh token does not match, send a 401 Unauthorized error
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate new access and refresh tokens
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    // Return the new access and refresh tokens in response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Endpoint to change user's current password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    // Extract oldPassword and newPassword from request body
    const { oldPassword, newPassword } = req.body;

    // Find the user by ID
    const user = await User.findById(req.user?._id);

    // Check if the old password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    // Throw an error if the old password is incorrect
    if (!isPasswordCorrect) {
      // If old password is incorrect, send a 400 Bad Request error
      throw new ApiError(400, "Invalid old password");
    }

    // Update the user's password and save it without validation
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Return a success response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Endpoint to get current user details
const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      // If user not found, send a 404 Not Found error
      throw new ApiError(404, "User does not exist");
    }

    // Return current user details in response
    return res
      .status(200)
      .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});


// Endpoint to update user's account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  try {
    // Extract fullName and email from request body
    const { fullName, email } = req.body;

    // Check if fullName and email are provided
    if (!fullName || !email) {
      // If any required field is missing, send a 400 Bad Request error
      throw new ApiError(400, "All fields are required");
    }

    // Update user's account details and retrieve the updated user
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: { fullName, email } },
      { new: true }
    ).select(
      "-password -refreshToken -watchHistory -otp -username -createdAt -updatedAt"
    );
    if (!user) {
      // If user does not exist, send a 404 Not Found error
      throw new ApiError(404, "User does not exist");
    }

    // Return a success response with the updated user
    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Endpoint to update user's avatar or coverImage
const updateUserImage = asyncHandler(async (req, res, imageType) => {
  try {
    const imageLocalPath = req.file?.path;
    const username = req.user.username;

    // Check if the image file is missing
    if (!imageLocalPath) {
      // If image file is missing, send a 400 Bad Request error
      throw new ApiError(400, `${imageType} file is missing`);
    }

    // Retrieve user and old image
    const user = await User.findOne({ username }).select(imageType);
    const oldImage = user[imageType];

    // Delete old image from Cloudinary if it exists
    if (oldImage) {
      const deleteResponse = await deleteFromCloudinary(oldImage, username);
      if (!deleteResponse) {
        // If error deleting old image, send a 500 Internal Server Error
        throw new ApiError(500, `Error while deleting old ${imageType}`);
      }
    }

    // Upload new image to Cloudinary
    const image = await uploadOnCloudinary(imageLocalPath, req.user.username);
    if (!image || !image.url) {
      // If error uploading new image, send a 400 Bad Request error
      throw new ApiError(400, `Error while uploading ${imageType}`);
    }

    // Update user with the new image URL
    const updateFields = { [imageType]: image.url };
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    ).select(
      "-password -refreshToken -watchHistory -otp -email -username -fullName -createdAt -updatedAt"
    );

    if (!updatedUser) {
      // If error updating user, send a 500 Internal Server Error
      throw new ApiError(500, `Error while updating ${imageType}`);
    }

    // Respond with success
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { updatedUser },
          `${imageType} image updated successfully.`
        )
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Helper functions to update avatar and cover image
const updateUserAvatar = (req, res) => updateUserImage(req, res, "avatar");
const updateUserCoverImage = (req, res) => updateUserImage(req, res, "coverImage");

// Get the current user for params
const getUserChannelProfile = asyncHandler(async (req, res) => {
  try {
    // Get the username from request parameters
    const { username } = req.params;

    // Check if the username is provided and not empty
    if (!username?.trim()) {
      // If username is missing or empty, send a 400 Bad Request error
      throw new ApiError(400, "Username is missing");
    }

    // Aggregate user data based on the provided username
    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);

    // Check if the channel data exists
    if (!channel?.length) {
      // If channel does not exist, send a 404 Not Found error
      throw new ApiError(404, "Channel does not exist");
    }

    // Return the user channel data as a response
    return res
      .status(200)
      .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Get the History
const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    // Aggregate user's watch history
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);

    // Return the user's watch history as a response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user[0].watchHistory,
          "Watch history fetched successfully"
        )
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Updated function to send OTP for forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    // Destructure email from request body
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    // Find the user with the provided email
    const user = await User.findOne({ email });

    // If user does not exist, throw an error
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Generate OTP for the user
    const otp = otpGenerator(); // Assuming otpGenerator function generates OTP

    // Save the generated OTP to the user object
    user.otp = otp;
    await user.save();

    // Send the OTP to the user's email
    await sendOTP({ email, otp, type: "forgetPassword" }); // Assuming sendOTP function accepts email and OTP

    // Return a success response with the generated OTP
    return res
      .status(200)
      .json(new ApiResponse(200, { otp }, "OTP sent successfully for password reset"));
  } catch (error) {
    handleErrorResponse(error, res);
  }
});

// Endpoint to set new password and reset old password using OTP
const resetPasswordWithOTP = asyncHandler(async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    // Check if email and OTP are provided
    if (!otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    // Find the user with the provided email
    const user = await User.findOne({ otp });

    // If user does not exist, throw an error
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Check if the provided OTP matches the user's stored OTP
    if (user.otp !== otp) {
      throw new ApiError(401, "Invalid OTP");
    }

    // Set the new password and clear the OTP
    user.password = newPassword;
    user.otp = null;
    await user.save();

    // Return a success response
    return res
      .status(200)
      .json(new ApiResponse(200, "Password reset successfully"));
  } catch (error) {
    handleErrorResponse(error, res);
  }
});

const assignRole = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User does not exist");
    }
    user.role = role;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Role changed for the user"));
  } catch (error) {
    handleErrorResponse(error, res);
  }
});


// // Endpoint to send reset password link to user's email
// const forgotPassword = asyncHandler(async (req, res) => {
//   try {
//     const { email } = req.body;

// Get email from the client and check if user exists
// const user = await User.findOne({ email });

// if (!user) {
//   throw new ApiError(404, "User does not exists", []);
// }

// // Generate a temporary token
// const { unHashedToken, hashedToken, tokenExpiry } =
//   user.generateTemporaryToken(); // generate password reset creds

// // save the hashed version a of the token and expiry in the DB
// user.forgotPasswordToken = hashedToken;
// user.forgotPasswordExpiry = tokenExpiry;
// await user.save({ validateBeforeSave: false });

// // Send mail with the password reset link. It should be the link of the frontend url with token
// await sendEmail({
//   email: user?.email,
//   subject: "Password reset request",
//   mailgenContent: forgotPasswordMailgenContent(
//     user.username,
//     // ! NOTE: Following link should be the link of the frontend page responsible to request password reset
//     // ! Frontend will send the below token with the new password in the request body to the backend reset password endpoint
//     // * Ideally take the url from the .env file which should be teh url of the frontend
//     `${req.protocol}://${req.get(
//       "host"
//     )}/api/v1/users/reset-password/${unHashedToken}`
//   ),
// });
// return res
//   .status(200)
//   .json(
//     new ApiResponse(
//       200,
//       {},
//       "Password reset mail has been sent on your mail id"
//     )
//   );
//   } catch (error) {
//     handleErrorResponse(error, res);
//   }
// });

// // Endpoint to set new password and reeset old password
// const resetPassword = asyncHandler(async (req, res) => {
//   try {
//    const { resetToken } = req.params;
// const { newPassword } = req.body;

// // Create a hash of the incoming reset token

// let hashedToken = crypto
//   .createHash("sha256")
//   .update(resetToken)
//   .digest("hex");

// See if user with hash similar to resetToken exists
// If yes then check if token expiry is greater than current date

// const user = await User.findOne({
//   forgotPasswordToken: hashedToken,
//   forgotPasswordExpiry: { $gt: Date.now() },
// });

// // If either of the one is false that means the token is invalid or expired
// if (!user) {
//   throw new ApiError(489, "Token is invalid or expired");
// }

// // if everything is ok and token id valid
// // reset the forgot password token and expiry
// user.forgotPasswordToken = undefined;
// user.forgotPasswordExpiry = undefined;

// // Set the provided password as the new password
// user.password = newPassword;
// await user.save({ validateBeforeSave: false });
// return res
//   .status(200)
//   .json(new ApiResponse(200, {}, "Password reset successfully"));
//   } catch (error) {
//     handleErrorResponse(error, res);
//   }
// });



// Export all endpoint
export {
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
  assignRole,
};
