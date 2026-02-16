import { DailyActivity } from "../types";

export const calculateStreak = (dailyActivities: DailyActivity[]): number => {
    if (!Array.isArray(dailyActivities) || dailyActivities.length === 0) {
        return 0;
    }

    const sorted = [...dailyActivities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    let streak = 0;
    const expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    for (const activity of sorted) {
        const activityDate = new Date(activity.date);
        activityDate.setHours(0, 0, 0, 0);

        if (activityDate.getTime() === expectedDate.getTime()) {
            if (activity.completed) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
                break;
            }
        } else if (activityDate.getTime() < expectedDate.getTime()) {
            break;
        }
    }

    return streak;
};
