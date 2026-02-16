import { UserDB } from "@database/models/user";
import { UserGamificationDB } from "@database/models/user_gamification";
import {
    UserGamificationData,
    AchievementResult,
    DailyActivity,
} from "../core/types";

const ensureUserGamificationExists = async (userId: string): Promise<void> => {
    const exists = await UserGamificationDB.findOne({ user_id: userId }).lean();

    if (!exists) {
        await UserGamificationDB.create({
            user_id: userId,
            achievements: [],
            totalPoints: 0,
            dailyActivities: [],
        });
    }
};

export const fetchUserGamificationData = async (
    userId: string,
): Promise<UserGamificationData> => {
    const user = await UserDB.findOne({ user_id: userId }).lean();
    if (!user) {
        throw new Error("User not found");
    }

    await ensureUserGamificationExists(userId);

    const gamification = await UserGamificationDB.findOne({ user_id: userId })
        .select("achievements totalPoints dailyActivities")
        .lean();

    const result = {
        userId,
        achievements: gamification?.achievements || [],
        totalPoints: gamification?.totalPoints || 0,
        dailyActivities: gamification?.dailyActivities || [],
    };

    return result;
};

export const saveUserAchievements = async (
    userId: string,
    newAchievements: AchievementResult[],
    additionalPoints: number,
): Promise<void> => {
    await ensureUserGamificationExists(userId);

    await UserGamificationDB.findOneAndUpdate(
        { user_id: userId },
        {
            $push: { achievements: { $each: newAchievements } },
            $inc: { totalPoints: additionalPoints },
        },
    );
};

export const fetchTodayActivity = async (
    userId: string,
): Promise<DailyActivity | null> => {
    await ensureUserGamificationExists(userId);

    const gamification = await UserGamificationDB.findOne({ user_id: userId })
        .select("dailyActivities")
        .lean();

    if (!gamification) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        gamification.dailyActivities?.find((activity) => {
            const activityDate = new Date(activity.date);
            activityDate.setHours(0, 0, 0, 0);
            return activityDate.getTime() === today.getTime();
        }) || null
    );
};

export const updateDailyActivity = async (
    userId: string,
    activity: DailyActivity,
): Promise<void> => {
    await ensureUserGamificationExists(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const gamification = await UserGamificationDB.findOne({ user_id: userId });

    const existingActivityIndex = gamification?.dailyActivities?.findIndex(
        (a) => {
            const activityDate = new Date(a.date);
            activityDate.setHours(0, 0, 0, 0);
            return activityDate.getTime() === today.getTime();
        },
    );

    if (existingActivityIndex !== undefined && existingActivityIndex >= 0) {
        await UserGamificationDB.findOneAndUpdate(
            { user_id: userId },
            {
                $set: {
                    [`dailyActivities.${existingActivityIndex}`]: activity,
                },
            },
        );
    } else {
        await UserGamificationDB.findOneAndUpdate(
            { user_id: userId },
            {
                $push: { dailyActivities: activity },
            },
        );
    }
};
