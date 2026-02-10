import { LevelInfo } from "../types";

interface LevelConfig {
    thresholds: number[];
    titles: string[];
}

const LEVEL_CONFIG: LevelConfig = {
    thresholds: [0, 10, 20, 50, 100, 200, 400, 700, 1000],
    titles: [
        "Débutant",
        "Novice",
        "Intermédiaire",
        "Confirmé",
        "Expert",
        "Maître",
        "Champion",
        "Légende",
        "Elite",
        "Grand Maître",
    ],
};

export const determineLevel = (totalPoints: number): LevelInfo => {
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

    return {
        level,
        title: titles[level] || "Inconnu",
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
