import { User, UserHealthAttributions, UserUpdates } from "@dtypes/user";
import { USER_DATA_UPDATES_TYPES } from "constants/data-updates";
import mongo, { Schema } from "mongoose";

const userSchema = new Schema<User>({
    user_id: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        max: 64,
        min: 6,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    first_name: {
        type: String,
        required: false,
    },
    last_name: {
        type: String,
        required: false,
    },
    quiz_finished: {
        type: Boolean,
        default: false,
    },
    chat_tokens: {
        type: Number,
        required: false,
        default: 5,
    },
    chat_tokens_refreshed_at: {
        type: Date,
        required: false,
    },
    avatar: {
        type: String,
        required: false,
    },
    appleId: {
        type: String,
        required: false,
    },
    social_conn: {
        type: String,
        required: false,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

const userHealthAttributions = new Schema<UserHealthAttributions>({
    user_id: {
        type: String,
        required: true,
        unique: true,
    },
    gender: {
        type: String,
        required: false,
    },
    birth_date: {
        type: String,
        required: false,
    },
    weight: {
        type: String,
        required: false,
    },
    weight_unit: {
        type: String,
        required: false,
    },
    height: {
        type: String,
        required: false,
    },
    height_unit: {
        type: String,
        required: false,
    },
    alcohol: {
        type: String,
        required: false,
    },
    smoking: {
        type: String,
        required: false,
    },
    health_goal: {
        type: String,
        required: false,
    },
    professional_help: {
        type: String,
        required: false,
    },
    medication_treatment: {
        type: String,
        required: false,
    },
    medical_treatments: {
        type: String,
        required: false,
    },
    surgery_before: {
        type: String,
        required: false,
    },
    chronic_illness: {
        type: String,
        required: false,
    },
    allergies: {
        type: String,
        required: false,
    },
    practice_sports: {
        type: String,
        required: false,
    },
    stress_level: {
        type: String,
        required: false,
    },
    summary_message: {
        type: String,
        required: false,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

const userUpdatesSchema = new Schema<UserUpdates>({
    user_id: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: USER_DATA_UPDATES_TYPES,
        required: true,
        index: true,
    },
    updated_at: {
        type: Date,
        default: Date.now,
        required: true,
    },
});

const UserDB = mongo.model<User>("User", userSchema);
const UserHealthAttributionsDB = mongo.model<UserHealthAttributions>(
    "User_Health_Attributions",
    userHealthAttributions,
);
const UserUpdatesDB = mongo.model<UserUpdates>(
    "User_Updates",
    userUpdatesSchema,
);

export { UserDB, UserHealthAttributionsDB, UserUpdatesDB };
