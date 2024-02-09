import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";

// Toggle like for a video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate the videoId to ensure it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId format");
  }
  const userId = req.user._id;

  try {
    // Define the condition to check if the user has already liked the video
    const condition = { likedBy: userId, video: videoId };

    // Check if the user has already liked the video
    const existingLike = await Like.findOne(condition);

    if (!existingLike) {
      // If not liked, create a new like entry
      const newLike = await Like.create(condition);
      return res
        .status(200)
        .json(
          new ApiResponse(200, { like: newLike }, "Video liked successfully")
        );
    } else {
      // If already liked, remove the like
      await Like.deleteOne(condition);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { like: null },
            "Video like removed successfully"
          )
        );
    }
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Toggle like for a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  // Validate the commentId to ensure it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid commentId ID format");
  }

  try {
    // Define the condition to check if the user has already liked the comment
    const condition = { likedBy: userId, comment: commentId };

    // Check if the user has already liked the comment
    const existingLike = await Like.findOne(condition);

    if (!existingLike) {
      // If not liked, create a new like entry
      const newLike = await Like.create(condition);
      return res
        .status(200)
        .json(
          new ApiResponse(200, { like: newLike }, "Comment liked successfully")
        );
    } else {
      // If already liked, remove the like
      await Like.deleteOne(condition);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { like: null },
            "Comment like removed successfully"
          )
        );
    }
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Toggle like for a tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // Validate the tweetId to ensure it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweetId ID format");
  }
  const userId = req.user._id;

  try {
    // Define the condition to check if the user has already liked the tweet
    const condition = { likedBy: userId, tweet: tweetId };

    // Check if the user has already liked the tweet
    const existingLike = await Like.findOne(condition);

    if (!existingLike) {
      // If not liked, create a new like entry
      const newLike = await Like.create(condition);
      return res
        .status(200)
        .json(
          new ApiResponse(200, { like: newLike }, "Tweet liked successfully")
        );
    } else {
      // If already liked, remove the like
      await Like.deleteOne(condition);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { like: null },
            "Tweet like removed successfully"
          )
        );
    }
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Get all videos liked by a user
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id

  try {
    // Retrieve all liked videos by the user
    const allLiked = await Like.find({
      likedBy: userId,
      video: { $exists: true },
    });

    // Return the response with the liked videos
    return res
      .status(200)
      .json(new ApiResponse(200, { allLiked }, "Successfully"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
