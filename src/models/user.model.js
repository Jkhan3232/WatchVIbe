import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import CryptoJS from "crypto-js";
import bcrypt from "bcrypt"
import {
    AvailableSocialLogins,
    AvailableUserRoles,
    USER_TEMPORARY_TOKEN_EXPIRY,
    UserLoginType,
    UserRolesEnum,
} from "../servers/constant.js";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        role: {
            type: String,
            enum: AvailableUserRoles,
            default: UserRolesEnum.USER,
            required: true,
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String, // cloudinary url
        },

        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        otp: {
            type: String,
            default: null,
        },
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        },

        loginType: {
            type: String,
            enum: AvailableSocialLogins,
            default: UserLoginType.EMAIL_PASSWORD,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        resetPasswordToken: {
            type: String,
        },
        resetPasswordExpire: {
            type: Date,
        },
        emailVerificationToken: {
            type: String,
        },
        emailVerificationExpiry: {
            type: Date,
        },
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// Method to Password Checking
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

// Method to generate generateAccessToken reset token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// Method to generate generateRefreshToken reset token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

//  generating tokens for email verification, password reset etc.

userSchema.methods.generateTemporaryToken = function () {
    // This token should be client-facing, for example, for email verification, unHashedToken should go into the user's mail
    const unHashedToken = CryptoJS.lib.WordArray.random(20).toString();

    // This should stay in the DB to compare at the time of verification
    const hashedToken = CryptoJS.SHA256(unHashedToken).toString();

    // This is the expiry time for the token (20 minutes)
    const tokenExpiry = Date.now() + USER_TEMPORARY_TOKEN_EXPIRY;

    return { unHashedToken, hashedToken, tokenExpiry };
};


export const User = mongoose.model("User", userSchema)