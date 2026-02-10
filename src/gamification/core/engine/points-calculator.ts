import { AchievementResult } from "../types";

export const calculateTotalPoints = (
    achievements: AchievementResult[],
): number => {
    return achievements.reduce((total, achievement) => {
        return total + (achievement.pointsEarned || 0);
    }, 0);
};

export const calculateStreakBonus = (consecutiveDays: number): number => {
    if (consecutiveDays >= 7) {
        return 20;
    } else if (consecutiveDays >= 5) {
        return 10;
    } else if (consecutiveDays >= 3) {
        return 5;
    }
    return 0;
};
