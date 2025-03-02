import mongo, { Schema } from "mongoose";

const userSchema = new Schema({
    user_id: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    appleId: {
        type: String,
        unique: true,
        required: false,
    },
    social_conn: {
        type: String,
        required: false,
    },
    password: {
        type: String,
        required: true,
        max: 64,
        min: 6,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    resetCode: {
        type: String,
        required: false,
    },
});

export default mongo.model("User", userSchema);
