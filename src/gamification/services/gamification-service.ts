import {
    evaluateAchievements,
    filterNewAchievements,
} from "../core/engine/achievement-engine";
import {
    calculateTotalPoints,
    calculateStreakBonus,
} from "../core/engine/points-calculator";
import { determineLevel } from "../core/engine/level-system";
import { calculateStreak } from "../core/engine/streak-calculator";
import { ACHIEVEMENT_RULES } from "../core/rules";
import * as dbAdapter from "../adapters/db-adapter";
import {
    UserProgress,
    GamificationProcessResult,
    DailyActivity,
} from "../core/types";
import { TFunction } from "i18next";

const calculateWeeklySteps = (dailyActivities: DailyActivity[]): number => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return dailyActivities
        .filter((activity) => new Date(activity.date) >= weekAgo)
        .reduce((total, activity) => total + (activity.steps || 0), 0);
};

export const processUserSteps = async (
    userId: string,
    stepCount: number,
    t?: TFunction,
): Promise<GamificationProcessResult> => {
    const userData = await dbAdapter.fetchUserGamificationData(userId);
    await dbAdapter.fetchTodayActivity(userId);

    const currentStreak = calculateStreak(userData.dailyActivities);

    const userProgress: UserProgress = {
        steps: stepCount,
        consecutiveDays: currentStreak,
        weeklySteps: calculateWeeklySteps(userData.dailyActivities),
        timestamp: new Date().toISOString(),
    };

    const evaluatedAchievements = evaluateAchievements(
        userProgress,
        ACHIEVEMENT_RULES,
    );

    const newAchievements = filterNewAchievements(
        evaluatedAchievements,
        userData.achievements,
    );

    const newPoints = calculateTotalPoints(newAchievements);
    const streakBonus = calculateStreakBonus(currentStreak);
    const totalNewPoints = newPoints + streakBonus;

    if (newAchievements.length > 0 || streakBonus > 0) {
        await dbAdapter.saveUserAchievements(
            userId,
            newAchievements,
            totalNewPoints,
        );
    }

    const updatedTotalPoints = Math.max(
        0,
        (userData.totalPoints || 0) + totalNewPoints,
    );

    const levelInfo = determineLevel(updatedTotalPoints, t);

    return {
        newAchievements,
        pointsEarned: totalNewPoints,
        currentStreak,
        streakBonus,
        levelInfo,
        totalPoints: updatedTotalPoints,
    };
};
