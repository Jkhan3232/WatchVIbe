
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";

// // Get channel statistics including total video views, subscribers, videos, and likes
const getChannelStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch channel information from the User model
    const channel = await User.findById(userId);

    if (!channel) {
      throw new ApiError(404, "Channel not found");
    }

    // Fetch the total video views for the channel
    const totalVideoViews = await Video.aggregate([
      {
        $match: { owner: userId },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
        },
      },
    ]);

    // Get total number of subscribers
    const totalSubscribers = await Subscription.countDocuments({
      channel: userId,
    });

    // Fetch the total number of videos for the channel
    const totalVideos = await Video.countDocuments({ owner: userId });

    // Fetch the total number of subscriptions for the channel
    const totalSubscriptions = await Subscription.countDocuments({
      channel: userId,
    });

    // Fetch the total number of likes across all videos of the channel
    const totalVideoLikes = await Like.countDocuments({
      likedBy: userId,
      video: { $exists: true },
    });

    // Fetch the total number of likes on tweets for the channel
    const totalTweetLikes = await Like.countDocuments({
      likedBy: userId,
      tweet: { $exists: true },
    });

    const countAll = {
      totalVideoViews: totalVideoViews[0]?.totalViews || 0,
      totalSubscribers,
      totalVideos,
      totalVideoLikes,
      totalTweetLikes,
      totalSubscriptions,
      // Add other stats here
    };

    // Return the channel stats as a response
    return res
      .status(200)
      .json(
        new ApiResponse(200, countAll, "Channel stats retrieved successfully")
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  try {
    // Assuming user id is available in the request object
    const userId = req.user._id;

    const pipeline = [
      // Match videos where the owner is the specified owner (creator)
      {
        $match: {
          owner: userId,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          videoFile: 1,
        },
      },
    ];

    const userVideos = await Video.aggregate(pipeline);

    // Check if any videos are found
    if (!userVideos || userVideos.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No videos found for the channel"));
    }

    // Return the channel videos as a response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          userVideos,
          "Channel videos retrieved successfully"
        )
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

export { getChannelStats, getChannelVideos };
