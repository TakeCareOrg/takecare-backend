import { RefreshToken } from "@dtypes/refreshToken";
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const refreshTokenSchema = new Schema({
    user_id: {
        type: String,
        ref: "User",
        required: true,
        index: true,
    },
    token_id: {
        type: String,
        required: true,
        unique: true,
    },
    expires_at: {
        type: Date,
        required: true,
        expires: 0,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

const RefreshTokenDB = mongoose.model<RefreshToken>(
    "refresh_tokens",
    refreshTokenSchema,
);

export { RefreshTokenDB };
