import { AchievementRules } from "../../types";

export const WEEKLY_STEPS_RULES: AchievementRules = {
    WEEKLY_STEPS_15K: {
        id: "weekly_steps_15k",
        type: "weekly",
        validator: (data) => data.weeklySteps >= 15000,
        points: 10,
        metadata: {
            title: "15000 pas hebdomadaires",
            icon: "",
        },
    },
    WEEKLY_STEPS_30K: {
        id: "weekly_steps_30k",
        type: "weekly",
        validator: (data) => data.weeklySteps >= 30000,
        points: 30,
        metadata: {
            title: "30000 pas hebdomadaires",
            icon: "",
        },
    },
    WEEKLY_STEPS_40K: {
        id: "weekly_steps_40k",
        type: "weekly",
        validator: (data) => data.weeklySteps >= 40000,
        points: 40,
        metadata: {
            title: "40000 pas hebdomadaires",
            icon: "",
        },
    },
    WEEKLY_CHALLENGE_50K: {
        id: "weekly_challenge_50k",
        type: "weekly",
        validator: (data) => data.weeklySteps >= 50000,
        points: 50,
        metadata: {
            title: "50000 pas hebdomadaires",
            icon: "",
        },
    },
    WEEKLY_STEPS_70K: {
        id: "weekly_steps_70k",
        type: "weekly",
        validator: (data) => data.weeklySteps >= 70000,
        points: 100,
        metadata: {
            title: "70000 pas hebdomadaires",
            icon: "",
        },
    },
};
