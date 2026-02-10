import { UserDB } from "@database/models/user";
import {
    UserGamificationData,
    AchievementResult,
    DailyActivity,
} from "../core/types";

export const fetchUserGamificationData = async (
    userId: string,
): Promise<UserGamificationData> => {
    const user = await UserDB.findOne({ user_id: userId })
        .select("gamification dailyActivities")
        .lean();

    if (!user) {
        throw new Error("User not found");
    }

    const result = {
        userId: user.user_id,
        achievements: user.gamification?.achievements || [],
        totalPoints: user.gamification?.totalPoints || 0,
        dailyActivities: user.dailyActivities || [],
    };

    return result;
};

export const saveUserAchievements = async (
    userId: string,
    newAchievements: AchievementResult[],
    additionalPoints: number,
): Promise<void> => {
    await UserDB.findOneAndUpdate(
        { user_id: userId },
        {
            $push: { "gamification.achievements": { $each: newAchievements } },
            $inc: { "gamification.totalPoints": additionalPoints },
        },
    );
};

export const fetchTodayActivity = async (
    userId: string,
): Promise<DailyActivity | null> => {
    const user = await UserDB.findOne({ user_id: userId }).select(
        "dailyActivities",
    );

    if (!user) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        user.dailyActivities?.find((activity) => {
            const activityDate = new Date(activity.date);
            activityDate.setHours(0, 0, 0, 0);
            return activityDate.getTime() === today.getTime();
        }) || null
    );
};
