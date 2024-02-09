import { ApiResponse } from "./ApiResponse.js";

class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }
}
const handleErrorResponse = (error, res) => {
    if (error instanceof ApiError) {
        // Handle specific API errors
        return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    } else {
        // Log the unexpected error
        console.error(error);

        // Handle other unexpected errors
        return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
    }
};

export { ApiError, handleErrorResponse }