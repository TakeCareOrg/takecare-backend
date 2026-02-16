import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { processUserSteps } from "../gamification/services/gamification-service";
import { determineLevel } from "../gamification/core/engine/level-system";
import { fetchUserGamificationData } from "../gamification/adapters/db-adapter";
import { translateAchievements } from "../gamification/core/utils/translate-achievements";

export const syncSteps: RequestMiddleware = async (req, res) => {
    const user = req.user;

    if (!user) {
        res.status(403).json({ message: "UNAUTHORIZED" });
        return;
    }

    const { steps } = req.body;

    if (typeof steps !== "number") {
        res.status(400).json({ message: "INVALID_STEPS_DATA" });
        return;
    }

    try {
        const result = await processUserSteps(user.user_id, steps, req.t);

        const translatedAchievements = translateAchievements(
            result.newAchievements,
            req.t,
        );

        res.json({
            success: true,
            data: {
                newAchievements: translatedAchievements,
                pointsEarned: result.pointsEarned,
                currentStreak: result.currentStreak,
                streakBonus: result.streakBonus,
                levelInfo: result.levelInfo,
                totalPoints: result.totalPoints,
            },
        });
    } catch (error) {
        Logger.error(`Error syncing steps: ${(error as Error).message}`);
        res.status(500).json({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
};

export const getProgress: RequestMiddleware = async (req, res) => {
    const user = req.user;

    if (!user) {
        res.status(403).json({ message: "UNAUTHORIZED" });
        return;
    }

    try {
        const userData = await fetchUserGamificationData(user.user_id);
        const levelInfo = determineLevel(userData.totalPoints, req.t);

        const translatedAchievements = translateAchievements(
            userData.achievements,
            req.t,
        );

        res.json({
            success: true,
            data: {
                achievements: translatedAchievements,
                totalPoints: userData.totalPoints,
                levelInfo,
                dailyActivities: userData.dailyActivities,
            },
        });
    } catch (error) {
        Logger.error(`Error fetching progress: ${(error as Error).message}`);
        res.status(500).json({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
        });
    }
};

export default { syncSteps, getProgress };
