import mongoose, { Schema } from "mongoose";

const subscription = new Schema(
    {
        subcriber: {
            type: Schema.Types.ObjectId, // one who is subscribeing
            ref: "User",
        },
        channel: {
            type: Schema.Types.ObjectId, // one to whom "subcriber" is subscribing
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

export const Subscription = mongoose.model("Subscription", subscription);
