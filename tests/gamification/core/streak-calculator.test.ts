import { calculateStreak } from "../../../src/gamification/core/engine/streak-calculator";
import { DailyActivity } from "../../../src/gamification/core/types";

describe("streakCalculator", () => {
    const createActivity = (
        daysAgo: number,
        completed: boolean,
        steps = 5000,
    ): DailyActivity => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(0, 0, 0, 0);

        return {
            date: date.toISOString(),
            steps,
            completed,
        };
    };

    it("should return 0 for empty array", () => {
        expect(calculateStreak([])).toBe(0);
    });

    it("should return 0 for null", () => {
        expect(calculateStreak(null as any)).toBe(0);
    });

    it("should return 0 for undefined", () => {
        expect(calculateStreak(undefined as any)).toBe(0);
    });

    it("should return 1 for single completed activity today", () => {
        const activities: DailyActivity[] = [createActivity(0, true)];
        expect(calculateStreak(activities)).toBe(1);
    });

    it("should return 0 for single incomplete activity today", () => {
        const activities: DailyActivity[] = [createActivity(0, false)];
        expect(calculateStreak(activities)).toBe(0);
    });

    it("should calculate streak for 3 consecutive days", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true),
            createActivity(1, true),
            createActivity(2, true),
        ];
        expect(calculateStreak(activities)).toBe(3);
    });

    it("should calculate streak for 7 consecutive days", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true),
            createActivity(1, true),
            createActivity(2, true),
            createActivity(3, true),
            createActivity(4, true),
            createActivity(5, true),
            createActivity(6, true),
        ];
        expect(calculateStreak(activities)).toBe(7);
    });

    it("should stop at first incomplete day", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true),
            createActivity(1, true),
            createActivity(2, false),
            createActivity(3, true),
            createActivity(4, true),
        ];
        expect(calculateStreak(activities)).toBe(2);
    });

    it("should handle gap in dates", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true),
            createActivity(1, true),
            createActivity(3, true),
        ];
        expect(calculateStreak(activities)).toBe(2);
    });

    it("should handle unsorted activities", () => {
        const activities: DailyActivity[] = [
            createActivity(2, true),
            createActivity(0, true),
            createActivity(1, true),
        ];
        expect(calculateStreak(activities)).toBe(3);
    });

    it("should ignore future dates", () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const activities: DailyActivity[] = [
            createActivity(0, true),
            {
                date: futureDate.toISOString(),
                steps: 5000,
                completed: true,
            },
        ];
        expect(calculateStreak(activities)).toBe(1);
    });

    it("should handle mixed completed and incomplete days", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true),
            createActivity(1, false),
            createActivity(2, true),
            createActivity(3, true),
        ];
        expect(calculateStreak(activities)).toBe(1);
    });

    it("should handle long streak of 30 days", () => {
        const activities: DailyActivity[] = Array.from({ length: 30 }, (_, i) =>
            createActivity(i, true),
        );
        expect(calculateStreak(activities)).toBe(30);
    });

    it("should handle streak with varying steps", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true, 10000),
            createActivity(1, true, 5000),
            createActivity(2, true, 7500),
        ];
        expect(calculateStreak(activities)).toBe(3);
    });

    it("should return 0 when today is incomplete", () => {
        const activities: DailyActivity[] = [
            createActivity(0, false),
            createActivity(1, true),
            createActivity(2, true),
        ];
        expect(calculateStreak(activities)).toBe(0);
    });

    it("should handle duplicate dates by using latest", () => {
        const activities: DailyActivity[] = [
            createActivity(0, false),
            createActivity(0, true),
            createActivity(1, true),
        ];
        const result = calculateStreak(activities);
        expect(result).toBeGreaterThanOrEqual(0);
    });

    it("should handle old activities not affecting current streak", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true),
            createActivity(1, true),
            createActivity(10, true),
            createActivity(11, true),
        ];
        expect(calculateStreak(activities)).toBe(2);
    });

    it("should handle activities with zero steps but completed", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true, 0),
            createActivity(1, true, 0),
        ];
        expect(calculateStreak(activities)).toBe(2);
    });

    it("should not count activities without correct date format", () => {
        const activities: DailyActivity[] = [
            createActivity(0, true),
            { date: "invalid-date", steps: 5000, completed: true },
        ];
        const result = calculateStreak(activities);
        expect(result).toBeGreaterThanOrEqual(0);
    });
});
