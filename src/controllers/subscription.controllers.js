import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id; // Assuming the user ID is attached to the request object

    // Validate the channelId
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, "Invalid channel ID format");
    }

    // Check if the subscription already exists
    const subscription = await Subscription.findOne({
      subcriber: userId,
      channel: channelId,
    });

    if (subscription) {
      // If subscription exists, remove it
      await Subscription.findByIdAndDelete(subscription._id);
      res.status(200).json(new ApiResponse(200, "Unsubscribed successfully"));
    } else {
      // If not, create a new subscription
      const newSubscription = new Subscription({
        subcriber: userId,
        channel: channelId,
      });
      await newSubscription.save();
      res.status(201).json(new ApiResponse(201, "Subscribed successfully"));
    }
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Validate the channelId
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channelId format");
  }
  try {
    // Find subscriptions for the given channel
    const subscribers = await Subscription.find({
      channel: new mongoose.Types.ObjectId(channelId),
    });

    // Respond with the list of subscribers
    return res
      .status(200)
      .json(new ApiResponse(200, { subscribers }, "Success"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  // Validate the subscriberId
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID format");
  }
  try {
    // Find channels to which the user has subscribed
    const channels = await Subscription.find({
      channel: new mongoose.Types.ObjectId(subscriberId),
    });

    // Respond with the list of subscribed channels
    return res.status(200).json(new ApiResponse(200, channels, "Success"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
