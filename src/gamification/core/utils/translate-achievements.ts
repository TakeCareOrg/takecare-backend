import { TFunction } from "i18next";
import { AchievementResult } from "../types";
import { ACHIEVEMENT_RULES } from "../rules";

export const translateAchievements = (
    achievements: AchievementResult[],
    t: TFunction,
): AchievementResult[] => {
    return achievements.map((achievement) => {
        const rule = Object.values(ACHIEVEMENT_RULES).find(
            (r) => r.id === achievement.achievementId,
        );

        if (!rule) {
            return achievement;
        }

        return {
            ...achievement,
            metadata: {
                title: t(rule.metadata.title),
                description: rule.metadata.description
                    ? t(rule.metadata.description)
                    : undefined,
                icon: rule.metadata.icon,
            },
        };
    });
};
