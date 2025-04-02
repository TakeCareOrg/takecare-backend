import { VerificationCode } from "@dtypes/verificationCodes";
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const verificationCodeSchema = new Schema({
    user_id: {
        type: String,
        ref: "User",
        required: true,
    },
    code: {
        type: Number,
        required: true,
    },
    is_reset: {
        type: Boolean,
        default: false,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

const VerificationCodeDB = mongoose.model<VerificationCode>(
    "verification_codes",
    verificationCodeSchema,
);

export { VerificationCodeDB };
