import { UserProgress, AchievementRules, AchievementResult } from "../types";
import Logger from "@libs/logger";

export const evaluateAchievements = (
    userProgress: UserProgress,
    rules: AchievementRules,
): AchievementResult[] => {
    if (!userProgress || typeof userProgress !== "object") {
        throw new Error("Invalid userProgress: must be an object");
    }

    const completedAchievements: AchievementResult[] = [];

    for (const [key, rule] of Object.entries(rules)) {
        try {
            if (rule.validator(userProgress)) {
                completedAchievements.push({
                    achievementId: rule.id,
                    pointsEarned: rule.points,
                    completedAt:
                        userProgress.timestamp || new Date().toISOString(),
                    metadata: rule.metadata,
                });
            }
        } catch (error) {
            Logger.error(
                `Error evaluating rule ${key}: ${(error as Error).message}`,
            );
        }
    }

    return completedAchievements;
};

export const filterNewAchievements = (
    newAchievements: AchievementResult[],
    existingAchievements: AchievementResult[],
): AchievementResult[] => {
    const existingIds = new Set(
        existingAchievements.map((a) => a.achievementId),
    );

    return newAchievements.filter(
        (achievement) => !existingIds.has(achievement.achievementId),
    );
};
