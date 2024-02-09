import { Video } from "../models/video.model.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose"; // Import mongoose for MongoDB related functionality

// Endpoint to upload videos
const uploadVideos = asyncHandler(async (req, res) => {
  try {
    // Extract required information from request
    const { title, description } = req.body;
    const userId = req.user._id;
    const username = req.user.username;

    // Validate the userId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid userId format");
    }

    // Validate required fields
    if (![title, description].every((field) => typeof field === "string" && field.trim())) {
      throw new ApiError(400, "Title and description are required");
    }

    // Extract file paths from request
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path || null;
    const thumbnailFileLocalPath = req.files?.thumbnail?.[0]?.path || null;

    // Check if video and thumbnail files are present
    if (!videoFileLocalPath || !thumbnailFileLocalPath) {
      throw new ApiError(400, "Video and Thumbnail files are required");
    }

    // Upload video file to Cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath, username, "video");
    if (!videoFile || !videoFile.url) {
      throw new ApiError(500, "Failed to upload video file to Cloudinary");
    }

    // Upload thumbnail file to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath, username, "thumbnail");
    if (!thumbnail || !thumbnail.url) {
      throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
    }

    // Create video record in the database
    const uploadVideo = await Video.create({
      videoFile: videoFile.url,
      thumbnail: thumbnail.url,
      title,
      description,
      owner: userId,
      duration: videoFile.duration,
    });

    if (!uploadVideo) {
      throw new ApiError(500, "Failed to save video details to the database");
    }

    // Return success response
    return res.status(200).json(new ApiResponse(200, "Success", uploadVideo));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Get all videos with optional filtering
const getAllVideos = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortType = "desc",
      userId,
    } = req.query;

    // Convert page and limit to number
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
      populate: "owner", // populate owner field
    };

    // If userId is provided, add it to the query
    const query = userId ? { owner: userId } : {};

    // Fetch videos using aggregatePaginate
    const videos = await Video.aggregatePaginate(query, options);

    // Return success response
    return res.status(200).json(new ApiResponse(200, "Success", videos));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Get a specific video by its ID.
const getVideoById = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    // Validate the videoId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid videoId format");
    }

    // Fetch video by id
    const video = await Video.findById(videoId);

    // If video is not found, return a 404 error
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // Return the video
    return res.status(200).json(new ApiResponse(200, "Success", video));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Update a video's details, including title, description, and thumbnail.
const updateVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailFileLocalPath = req.file?.path || null;
    const username = req.user.username;

    // Validate the videoId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid videoId format");
    }
    // Validate required fields
    if (![title, description].every((field) => typeof field === "string" && field.trim())) {
      throw new ApiError(400, "Title and description are required");
    }

    // Check if thumbnail file is present
    if (!thumbnailFileLocalPath) {
      throw new ApiError(400, "Thumbnail file is required");
    }

    // Retrieve video and old thumbnail image
    const video = await Video.findById(videoId);
    const oldThumbnail = video.thumbnail;

    // Delete old thumbnail from Cloudinary if it exists
    if (oldThumbnail) {
      const deleteResponse = await deleteFromCloudinary(oldThumbnail, username);
      if (!deleteResponse) {
        throw new ApiError(500, "Error while deleting old thumbnail");
      }
    }

    // Upload new thumbnail file to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailFileLocalPath, username, "thumbnail");
    if (!thumbnail || !thumbnail.url) {
      throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
    }

    // Update video with new details
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { title, description, thumbnail: thumbnail.url },
      { new: true }
    );

    // If video is not found, return a 404 error
    if (!updatedVideo) {
      throw new ApiError(404, "Video not found");
    }

    // Return the updated video
    return res.status(200).json(new ApiResponse(200, "Success", updatedVideo));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Delete a video, including its thumbnail and video file from Cloudinary.
const deleteVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    // Validate the videoId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid videoId format");
    }
    // Retrieve video to get the thumbnail and video file
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // Delete thumbnail from Cloudinary if it exists
    if (video.thumbnail) {
      const deleteThumbnailResponse = await deleteFromCloudinary(video.thumbnail);
      if (!deleteThumbnailResponse) {
        throw new ApiError(500, "Error while deleting thumbnail from Cloudinary");
      }
    }

    // Delete video file from Cloudinary if it exists
    if (video.file) {
      const deleteVideoFileResponse = await deleteFromCloudinary(video.file);
      if (!deleteVideoFileResponse) {
        throw new ApiError(500, "Error while deleting video file from Cloudinary");
      }
    }

    // Delete video from the database
    const deleteVideoResponse = await Video.findByIdAndDelete(videoId);
    if (!deleteVideoResponse) {
      throw new ApiError(500, "Error while deleting video");
    }

    // Send success response
    return res.status(200).json(new ApiResponse(200, "Video deleted successfully"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Toggle the publish status of a video.
const togglePublishStatus = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    // Validate the videoId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid videoId format");
    }
    // Fetch video by id
    const video = await Video.findById(videoId);

    // If video is not found, return a 404 error
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // Toggle the publish status
    video.isPublished = !video.isPublished;

    // Save the updated video
    const updatedVideo = await video.save();

    // Return the updated video
    return res.status(200).json(new ApiResponse(200, "Success", updatedVideo));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});


export {
  getAllVideos,
  uploadVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
