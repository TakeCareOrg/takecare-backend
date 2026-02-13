import { AchievementRules } from "../../types";

export const MILESTONE_STEPS_RULES: AchievementRules = {
    MILESTONE_STEPS_100K: {
        id: "milestone_steps_100k",
        type: "milestone",
        validator: (data) => data.steps >= 100000,
        points: 500,
        metadata: {
            title: "achievements.milestone.steps_100k.title",
            description: "achievements.milestone.steps_100k.description",
            icon: "",
        },
    },
    MILESTONE_STEPS_200K: {
        id: "milestone_steps_200k",
        type: "milestone",
        validator: (data) => data.steps >= 200000,
        points: 500,
        metadata: {
            title: "achievements.milestone.steps_200k.title",
            description: "achievements.milestone.steps_200k.description",
            icon: "",
        },
    },
    MILESTONE_STEPS_300K: {
        id: "milestone_steps_300k",
        type: "milestone",
        validator: (data) => data.steps >= 300000,
        points: 500,
        metadata: {
            title: "achievements.milestone.steps_300k.title",
            description: "achievements.milestone.steps_300k.description",
            icon: "",
        },
    },
    MILESTONE_STEPS_400K: {
        id: "milestone_steps_400k",
        type: "milestone",
        validator: (data) => data.steps >= 400000,
        points: 500,
        metadata: {
            title: "achievements.milestone.steps_400k.title",
            description: "achievements.milestone.steps_400k.description",
            icon: "",
        },
    },
    MILESTONE_STEPS_500K: {
        id: "milestone_steps_500k",
        type: "milestone",
        validator: (data) => data.steps >= 500000,
        points: 500,
        metadata: {
            title: "achievements.milestone.steps_500k.title",
            description: "achievements.milestone.steps_500k.description",
            icon: "",
        },
    },
    MILESTONE_STEPS_1M: {
        id: "milestone_steps_1m",
        type: "milestone",
        validator: (data) => data.steps >= 1000000,
        points: 500,
        metadata: {
            title: "achievements.milestone.steps_1m.title",
            description: "achievements.milestone.steps_1m.description",
            icon: "",
        },
    },
};
