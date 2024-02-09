import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError, handleErrorResponse } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";

//Endpoint get videocomment
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate the videoId to ensure it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }
  const { page = 1, limit = 10 } = req.query;
  try {
    const allComments = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId), // Match the raw Video id to the video id in the Database
        },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: parseInt(limit, 10),
      },
    ]);
    if (allComments.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No comments found for the video"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, { allComments }, "Success"));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Endpoint add comments
const addComment = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params; // Extract videoId from request parameters
    const { content } = req.body; // Extract comment text from request body

    // Validate the videoId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid video ID format");
    }

    // Validate that the comment text is not empty
    if (!content) {
      throw new ApiError(400, "Comment text cannot be empty");
    }

    // Create a new comment instance
    const comment = new Comment({
      video: videoId,
      content: content,
      owner: req.user._id, // Assuming the user ID is attached to the request object
    });

    // Save the comment to the database
    await comment.save();

    // Send success response with the created comment
    return res
      .status(201)
      .json(new ApiResponse(201, "Comment added successfully", comment));
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

// Endpoint for updating comments
const updateComment = asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params; // Extract commentId from request parameters
    const { content } = req.body; // Extract updated comment text from request body

    // Validate the commentId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, "Invalid comment ID format");
    }

    // Validate that the updated comment text is not empty
    if (!content) {
      throw new ApiError(400, "Comment text cannot be empty");
    }

    // Find the comment by ID and update its content
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content: content },
      { new: true } // Return the updated document
    );

    // If no comment found, throw an error
    if (!updatedComment) {
      throw new ApiError(404, "Comment not found");
    }

    // Send success response with the updated comment
    res
      .status(200)
      .json(
        new ApiResponse(200, "Comment updated successfully", updatedComment)
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

//Endpoint delete comment
const deleteComment = asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params; // Extract commentId from request parameters

    // Validate the commentId to ensure it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, "Invalid comment ID format");
    }

    // Find the comment by ID and delete it
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    // If no comment found, throw an error
    if (!deletedComment) {
      throw new ApiError(404, "Comment not found");
    }

    // Send success response with the deleted comment
    res
      .status(200)
      .json(
        new ApiResponse(200, "Comment deleted successfully", deletedComment)
      );
  } catch (error) {
    handleErrorResponse(error, res)
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
