import { AchievementRules } from "../../types";

export const MILESTONE_STEPS_RULES: AchievementRules = {
    MILESTONE_STEPS_100K: {
        id: "milestone_steps_100k",
        type: "milestone",
        validator: (data) => data.steps >= 100000,
        points: 500,
        metadata: {
            title: "100000 pas hebdomadaires",
            icon: "",
        },
    },
    MILESTONE_STEPS_200K: {
        id: "milestone_steps_200k",
        type: "milestone",
        validator: (data) => data.steps >= 200000,
        points: 500,
        metadata: {
            title: "200000 pas hebdomadaires",
            icon: "",
        },
    },
    MILESTONE_STEPS_300K: {
        id: "milestone_steps_300k",
        type: "milestone",
        validator: (data) => data.steps >= 300000,
        points: 500,
        metadata: {
            title: "70000 pas hebdomadaires",
            icon: "",
        },
    },
    MILESTONE_STEPS_400K: {
        id: "milestone_steps_400k",
        type: "milestone",
        validator: (data) => data.steps >= 400000,
        points: 500,
        metadata: {
            title: "70000 pas hebdomadaires",
            icon: "",
        },
    },
    MILESTONE_STEPS_500K: {
        id: "milestone_steps_500k",
        type: "milestone",
        validator: (data) => data.steps >= 500000,
        points: 500,
        metadata: {
            title: "80000 pas hebdomadaires",
            icon: "",
        },
    },
    MILESTONE_STEPS_1M: {
        id: "milestone_steps_1m",
        type: "milestone",
        validator: (data) => data.steps >= 1000000,
        points: 500,
        metadata: {
            title: "80000 pas hebdomadaires",
            icon: "",
        },
    },
};
