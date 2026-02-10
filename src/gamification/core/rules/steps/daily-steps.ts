import { AchievementRules } from "../../types";

export const DAILY_STEPS_RULES: AchievementRules = {
    DAILY_STEPS_2K: {
        id: "daily_steps_2k",
        type: "daily",
        validator: (data) => data.steps >= 2000,
        points: 5,
        metadata: {
            title: "2000 pas quotidiens",
            icon: "",
        },
    },
    DAILY_STEPS_5K: {
        id: "daily_steps_5k",
        type: "daily",
        validator: (data) => data.steps >= 5000,
        points: 10,
        metadata: {
            title: "5000 pas quotidiens",
            icon: "",
        },
    },
    DAILY_STEPS_10K: {
        id: "daily_steps_10k",
        type: "daily",
        validator: (data) => data.steps >= 10000,
        points: 25,
        metadata: {
            title: "10000 pas quotidiens",
            icon: "",
        },
    },
    DAILY_STEPS_15K: {
        id: "daily_steps_15k",
        type: "daily",
        validator: (data) => data.steps >= 15000,
        points: 50,
        metadata: {
            title: "15000 pas quotidiens",
            icon: "",
        },
    },
};
