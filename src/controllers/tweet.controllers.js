import { Tweet } from "../models/tweet.model.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";
import mongoose from "mongoose";

// Function to create a new tweet
const createTweet = asyncHandler(async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user._id;

    // Validate the userId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid userID format");
    }

    // Check if userId is provided
    if (!userId) {
      throw new ApiError(401, "You do not have permission to create Tweets");
    }

    // Check if content is provided
    if (!content) {
      throw new ApiError(400, "Content is required");
    }

    // Create a new tweet
    const tweet = new Tweet({
      content,
      owner: userId,
    });

    // Save the tweet
    await tweet.save();

    // Return the created tweet
    return res
      .status(201)
      .json(new ApiResponse(201, "Tweet created successfully", tweet));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Get Tweets By userId Endpoint
const getUserTweets = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate the userId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid userID format");
    }
    // Fetch the tweets
    const tweets = await Tweet.find({ owner: userId });

    // Check if any tweets were found
    if (!tweets || tweets.length === 0) {
      throw new ApiError(404, "No tweets found for this user");
    }

    // Return the fetched tweets
    return res
      .status(200)
      .json(new ApiResponse(200, "Tweets retrieved successfully", { tweets }));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Update Tweet By twwetId Endpoint
const updateTweet = asyncHandler(async (req, res) => {
  try {
    const { content } = req.body;
    const { tweetId } = req.params;

    // Validate the tweetId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid tweetId format");
    }

    // Check if content and tweetId are provided
    if (!content || !tweetId) {
      throw new ApiError(400, "Content and Tweet ID are required");
    }

    // Update the tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
      { _id: tweetId },
      { $set: { content: content } },
      { new: true }
    );

    // Check if the tweet was found and updated
    if (!updatedTweet) {
      throw new ApiError(404, "Tweet not found");
    }

    // Return the updated tweet
    return res
      .status(200)
      .json(new ApiResponse(200, "Tweet updated successfully", updatedTweet));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Delete Tweet By tweetId Endpoint
const deleteTweet = asyncHandler(async (req, res) => {
  try {
    const { tweetId } = req.params;

    // Validate the tweetId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid tweetId format");
    }

    // Delete the tweet
    const deletedTweet = await Tweet.findByIdAndDelete(
      { _id: tweetId },
      { new: true }
    );

    // Check if the tweet was found and deleted
    if (!deletedTweet) {
      throw new ApiError(404, "Tweet not found");
    }

    // Return the deleted tweet
    return res
      .status(200)
      .json(
        new ApiResponse(200, { deletedTweet }, "Tweet deleted successfully")
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
