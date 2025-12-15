import { User, UserHealthAttributions } from "@dtypes/user";
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
    age: {
        type: Number,
        required: false,
    },
    weight: {
        type: Number,
        required: false,
    },
    weight_unit: {
        type: String,
        required: false,
    },
    height: {
        type: Number,
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
        type: Array,
        required: false,
    },
    professional_help: {
        type: Array,
        required: false,
    },
    medication_treatment: {
        type: Array,
        required: false,
    },
    medical_treatments: {
        type: Array,
        required: false,
    },
    surgery_before: {
        type: Array,
        required: false,
    },
    chronic_illness: {
        type: Array,
        required: false,
    },
    allergies: {
        type: Array,
        required: false,
    },
    practice_sports: {
        type: Array,
        required: false,
    },
    stress_level: {
        type: Number,
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

const UserDB = mongo.model<User>("User", userSchema);
const UserHealthAttributionsDB = mongo.model<UserHealthAttributions>(
    "User_Health_Attributions",
    userHealthAttributions,
);

export { UserDB, UserHealthAttributionsDB };
