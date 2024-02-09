import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandaler.js";

const healthcheck = asyncHandler(async (req, res) => {
  try {
    // Assuming all health check conditions are met
    const healthStatus = {
      status: "OK",
      message: "Health check passed successfully",
    };

    // Return the health check response as JSON
    return res
      .status(200)
      .json(
        new ApiResponse(200, healthStatus, "Health check passed successfully")
      );
  } catch (error) {
    console.error(`Health check failed: ${error.message}`);

    // Return a 500 Internal Server Error if there's an error during health check
    throw new ApiError(500, "Health check failed");
  }
});

export { healthcheck };
