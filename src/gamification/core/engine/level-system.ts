import { LevelInfo } from "../types";
import { TFunction } from "i18next";

interface LevelConfig {
    thresholds: number[];
    titles: string[];
}

const LEVEL_CONFIG: LevelConfig = {
    thresholds: [0, 10, 20, 50, 100, 200, 400, 700, 1000],
    titles: [
        "levels.titles.0",
        "levels.titles.1",
        "levels.titles.2",
        "levels.titles.3",
        "levels.titles.4",
        "levels.titles.5",
        "levels.titles.6",
        "levels.titles.7",
        "levels.titles.8",
        "levels.titles.9",
    ],
};

export const determineLevel = (
    totalPoints: number,
    t?: TFunction,
): LevelInfo => {
    if (typeof totalPoints !== "number" || totalPoints < 0) {
        throw new Error("Invalid totalPoints: must be a non-negative number");
    }

    const { thresholds, titles } = LEVEL_CONFIG;

    let level = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (totalPoints >= thresholds[i]) {
            level = i;
            break;
        }
    }

    const nextLevel = level + 1;
    const currentThreshold = thresholds[level];
    const nextThreshold = thresholds[nextLevel] ?? null;

    const title = t
        ? t(titles[level]) || t("levels.titles.unknown", "Unknown")
        : titles[level] || "levels.titles.unknown";

    return {
        level,
        title,
        currentPoints: totalPoints,
        pointsForCurrentLevel: currentThreshold,
        pointsForNextLevel: nextThreshold,
        progressToNextLevel: nextThreshold
            ? ((totalPoints - currentThreshold) /
                  (nextThreshold - currentThreshold)) *
              100
            : 100,
    };
};

export const getLevelConfig = (): Readonly<LevelConfig> => LEVEL_CONFIG;
