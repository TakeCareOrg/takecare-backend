import { AchievementRules } from "../../types";

export const DAILY_STEPS_RULES: AchievementRules = {
    DAILY_STEPS_1: {
        id: "daily_steps_10",
        type: "daily",
        validator: (data) => data.steps >= 10,
        points: 1,
        metadata: {
            title: "achievements.daily.steps_10.title",
            description: "achievements.daily.steps_10.description",
            icon: "👟",
        },
    },
    DAILY_STEPS_1K: {
        id: "daily_steps_1k",
        type: "daily",
        validator: (data) => data.steps >= 1000,
        points: 3,
        metadata: {
            title: "achievements.daily.steps_1k.title",
            description: "achievements.daily.steps_1k.description",
            icon: "👟",
        },
    },
    DAILY_STEPS_2K: {
        id: "daily_steps_2k",
        type: "daily",
        validator: (data) => data.steps >= 2000,
        points: 5,
        metadata: {
            title: "achievements.daily.steps_2k.title",
            description: "achievements.daily.steps_2k.description",
            icon: "👟",
        },
    },
    DAILY_STEPS_5K: {
        id: "daily_steps_5k",
        type: "daily",
        validator: (data) => data.steps >= 5000,
        points: 10,
        metadata: {
            title: "achievements.daily.steps_5k.title",
            description: "achievements.daily.steps_5k.description",
            icon: "👟",
        },
    },
    DAILY_STEPS_10K: {
        id: "daily_steps_10k",
        type: "daily",
        validator: (data) => data.steps >= 10000,
        points: 25,
        metadata: {
            title: "achievements.daily.steps_10k.title",
            description: "achievements.daily.steps_10k.description",
            icon: "👟",
        },
    },
    DAILY_STEPS_15K: {
        id: "daily_steps_15k",
        type: "daily",
        validator: (data) => data.steps >= 15000,
        points: 50,
        metadata: {
            title: "achievements.daily.steps_15k.title",
            description: "achievements.daily.steps_15k.description",
            icon: "👟",
        },
    },
};
