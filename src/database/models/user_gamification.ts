import mongo, { Schema, Document } from "mongoose";
import { AchievementResult, DailyActivity } from "@dtypes/user";

const achievementResultSchema = new Schema(
    {
        achievementId: {
            type: String,
            required: true,
        },
        pointsEarned: {
            type: Number,
            required: true,
        },
        completedAt: {
            type: String,
            required: true,
        },
        metadata: {
            title: { type: String, required: true },
            icon: { type: String, required: true },
            description: { type: String, required: false },
        },
    },
    { _id: false },
);

const dailyActivitySchema = new Schema(
    {
        date: {
            type: String,
            required: true,
        },
        steps: {
            type: Number,
            required: true,
            default: 0,
        },
        completed: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { _id: false },
);

interface IUserGamification extends Document {
    user_id: string;
    achievements: AchievementResult[];
    totalPoints: number;
    dailyActivities: DailyActivity[];
    createdAt: Date;
    updatedAt: Date;
}

const userGamificationSchema = new Schema<IUserGamification>(
    {
        user_id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        achievements: [achievementResultSchema],
        totalPoints: {
            type: Number,
            default: 0,
        },
        dailyActivities: [dailyActivitySchema],
    },
    {
        timestamps: true,
        collection: "user_gamification",
    },
);

export const UserGamificationDB = mongo.model<IUserGamification>(
    "UserGamification",
    userGamificationSchema,
);
