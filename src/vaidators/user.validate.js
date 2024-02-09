import { body, param } from "express-validator";
import { AvailableUserRoles } from "../servers/constant.js";

// Validation for user registration
const userRegisterValidator = () => {
    return [
        // Validate email
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        // Validate username
        body("username")
            .trim()
            .notEmpty()
            .withMessage("Username is required")
            .isLowercase()
            .withMessage("Username must be lowercase")
            .isLength({ min: 3 })
            .withMessage("Username must be at lease 3 characters long"),
        body("fullName")
            .trim()
            .notEmpty()
            .withMessage("Fullname is required")
            .isLength({ min: 3 })
            .withMessage("Username must be at lease 3 characters long"),
        // Validate password
        body("password").trim().notEmpty().withMessage("Password is required"),
        // Validate user role
        body("role")
            .optional()
            .isIn(AvailableUserRoles)
            .withMessage("Invalid user role"),
    ];
};

// Validation for user login
const userLoginValidator = () => {
    return [
        // Validate email for login
        body("email").optional().isEmail().withMessage("Email is invalid"),
        // Validate password for login
        body("username").optional(),
        body("password").notEmpty().withMessage("Password is required"),
    ];
};

// Validation for changing current password
const userChangeCurrentPasswordValidator = () => {
    return [
        // Validate old password
        body("oldPassword").notEmpty().withMessage("Old password is required"),
        // Validate new password
        body("newPassword").notEmpty().withMessage("New password is required"),
    ];
};

// Validation for forgot password
const userForgotPasswordValidator = () => {
    return [
        // Validate email for forgot password
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
    ];
};

// Validation for resetting forgotten password
const userResetForgottenPasswordValidator = () => {
    return [
        // Validate new password for reset
        body("newPassword").notEmpty().withMessage("Password is required"),
    ];
};

// Validation for assigning user role
const userAssignRoleValidator = () => {
    return [
        // Validate user role assignment
        body("role")
            .optional()
            .isIn(AvailableUserRoles)
            .withMessage("Invalid user role"),
    ];
};

export {
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userLoginValidator,
    userRegisterValidator,
    userResetForgottenPasswordValidator,
    userAssignRoleValidator
};