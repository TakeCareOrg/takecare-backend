import { AchievementRules } from "../types";
import { DAILY_STEPS_RULES } from "./steps/daily-steps";
import { WEEKLY_STEPS_RULES } from "./steps/weekly-steps";
import { MILESTONE_STEPS_RULES } from "./steps/milestone-steps";

export const ACHIEVEMENT_RULES: AchievementRules = {
    ...DAILY_STEPS_RULES,
    ...WEEKLY_STEPS_RULES,
    ...MILESTONE_STEPS_RULES,
};
