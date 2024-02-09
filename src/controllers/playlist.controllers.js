import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";

// Create Playlist Endpoint
const createPlaylist = asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body;
    const { videoId } = req.params;

    // Validate the videoId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid videoId format");
    }
    // Validate playlist data
    if (!name || !description) {
      throw new ApiError(400, "Playlist name and description is required");
    }

    // Create new playlist instance
    const newPlaylist = new Playlist({
      name,
      description,
      videos: videoId,
      owner: req.user._id, // Assuming user is attached to request after auth
    });

    // Save playlist to database
    const playlist = await newPlaylist.save();

    // Send success response with created playlist data
    res
      .status(201)
      .json(new ApiResponse(201, "Playlist created successfully", playlist));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Get Playlist By userId Endpoint
const getUserPlaylists = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate the userId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid userID format");
    }

    // Fetch playlists owned by the user
    const playlists = await Playlist.find({ owner: userId });

    // Check if user has playlists
    if (!playlists.length) {
      return res
        .status(404)
        .json(new ApiResponse(404, "No playlists found for this user", {}));
    }

    // Send success response with user's playlists
    res
      .status(200)
      .json(
        new ApiResponse(200, "Playlists retrieved successfully", playlists)
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Get Playlist By playlistId Endpoint
const getPlaylistById = asyncHandler(async (req, res) => {
  try {
    const { playlistId } = req.params;
    // Validate the playlistId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      throw new ApiError(400, "Invalid playlistID format");
    }
    // Fetch playlist by id
    const playlist = await Playlist.findById(playlistId);
    // If no playlist found, throw an error
    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
    // Send success response with the playlist
    res
      .status(200)
      .json(new ApiResponse(200, "Playlist retrieved successfully", playlist));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Add Videos to Playlist Endpoint
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  try {
    const { playlistId, videoId } = req.params;

    // Validate the playlistId and videoId to ensure they're valid ObjectIds
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId or videoId format");
    }
    // Fetch the playlist
    const playlist = await Playlist.findById(playlistId);
    // If no playlist found, throw an error
    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
    // Add the video to the playlist
    playlist.videos.push(videoId);
    await playlist.save();
    // Send success response
    res
      .status(200)
      .json(
        new ApiResponse(200, "Video added to playlist successfully", playlist)
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Remove Video from Playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  try {
    const { playlistId, videoId } = req.params;

    // Validate the playlistId and videoId to ensure they're valid ObjectIds
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid playlistId or videoId format");

    }
    // Fetch the playlist and update it by removing the video
    const playlist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { videos: videoId } },
      { new: true }
    );
    // If no playlist found, throw an error
    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
    // Send success response with the updated playlist
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Video removed from playlist successfully",
          playlist
        )
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Delete Playlist Endpoint
const deletePlaylist = asyncHandler(async (req, res) => {
  try {
    const { playlistId } = req.params;
    // Validate the playlistId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid playlistID format");
    }
    // Delete the playlist
    const playlist = await Playlist.findByIdAndDelete(playlistId);
    // If no playlist found, throw an error
    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
    // Send success response confirming deletion
    res
      .status(200)
      .json(new ApiResponse(200, "Playlist deleted successfully", {}));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Update Playlist Endponit
const updatePlaylist = asyncHandler(async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    // Validate the playlistId to ensure it's a valid ObjectId
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid ID format");
    }
    // Update the playlist with the provided name and description
    const playlist = await Playlist.findByIdAndUpdate(
      playlistId,
      { name, description },
      { new: true, runValidators: true }
    );
    // If no playlist found, throw an error
    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
    // Send success response with the updated playlist
    return res
      .status(200)
      .json(new ApiResponse(200, "Playlist updated successfully", playlist));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
