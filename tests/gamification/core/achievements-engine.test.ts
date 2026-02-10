import {
    evaluateAchievements,
    filterNewAchievements,
} from "../../../src/gamification/core/engine/achievement-engine";
import {
    UserProgress,
    AchievementResult,
    AchievementRules,
} from "../../../src/gamification/core/types";
import Logger from "../../../src/libs/logger";

jest.mock("../../../src/libs/logger");

describe("achievementEngine", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("evaluateAchievements", () => {
        const mockRules: AchievementRules = {
            TEST_RULE_1: {
                id: "test_rule_1",
                type: "daily",
                validator: (data) => data.steps >= 5000,
                points: 10,
                metadata: { title: "Test 1", icon: "🎯" },
            },
            TEST_RULE_2: {
                id: "test_rule_2",
                type: "streak",
                validator: (data) => data.consecutiveDays >= 3,
                points: 20,
                metadata: { title: "Test 2", icon: "🔥" },
            },
            TEST_RULE_3: {
                id: "test_rule_3",
                type: "weekly",
                validator: (data) => data.weeklySteps >= 10000,
                points: 50,
                metadata: { title: "Test 3", icon: "⭐" },
            },
        };

        it("should return empty array when no rules match", () => {
            const userProgress: UserProgress = {
                steps: 100,
                consecutiveDays: 0,
                weeklySteps: 500,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, mockRules);
            expect(result).toEqual([]);
        });

        it("should return single achievement when one rule matches", () => {
            const userProgress: UserProgress = {
                steps: 6000,
                consecutiveDays: 0,
                weeklySteps: 6000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, mockRules);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                achievementId: "test_rule_1",
                pointsEarned: 10,
                completedAt: "2024-02-09T12:00:00Z",
                metadata: { title: "Test 1", icon: "🎯" },
            });
        });

        it("should return multiple achievements when multiple rules match", () => {
            const userProgress: UserProgress = {
                steps: 6000,
                consecutiveDays: 5,
                weeklySteps: 15000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, mockRules);

            expect(result).toHaveLength(3);
            expect(result.map((r) => r.achievementId)).toContain("test_rule_1");
            expect(result.map((r) => r.achievementId)).toContain("test_rule_2");
            expect(result.map((r) => r.achievementId)).toContain("test_rule_3");
        });

        it("should use current timestamp when userProgress timestamp is missing", () => {
            const userProgress: UserProgress = {
                steps: 6000,
                consecutiveDays: 0,
                weeklySteps: 6000,
                timestamp: "",
            };

            const result = evaluateAchievements(userProgress, mockRules);

            expect(result).toHaveLength(1);
            expect(new Date(result[0].completedAt)).toBeInstanceOf(Date);
        });

        it("should throw error when userProgress is null", () => {
            expect(() => {
                evaluateAchievements(null as any, mockRules);
            }).toThrow("Invalid userProgress: must be an object");
        });

        it("should throw error when userProgress is undefined", () => {
            expect(() => {
                evaluateAchievements(undefined as any, mockRules);
            }).toThrow("Invalid userProgress: must be an object");
        });

        it("should throw error when userProgress is not an object", () => {
            expect(() => {
                evaluateAchievements("invalid" as any, mockRules);
            }).toThrow("Invalid userProgress: must be an object");
        });

        it("should continue evaluating other rules when one validator throws error", () => {
            const mixedRules: AchievementRules = {
                BROKEN_RULE: {
                    id: "broken_rule",
                    type: "daily",
                    validator: () => {
                        throw new Error("Validator error");
                    },
                    points: 10,
                    metadata: { title: "Broken", icon: "💀" },
                },
                WORKING_RULE: {
                    id: "working_rule",
                    type: "daily",
                    validator: (data) => data.steps >= 5000,
                    points: 10,
                    metadata: { title: "Working", icon: "✅" },
                },
            };

            const userProgress: UserProgress = {
                steps: 6000,
                consecutiveDays: 0,
                weeklySteps: 6000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, mixedRules);

            expect(result).toHaveLength(1);
            expect(result[0].achievementId).toBe("working_rule");
            expect(Logger.error).toHaveBeenCalledWith(
                "Error evaluating rule BROKEN_RULE: Validator error",
            );
        });

        it("should handle empty rules object", () => {
            const userProgress: UserProgress = {
                steps: 6000,
                consecutiveDays: 5,
                weeklySteps: 15000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, {});
            expect(result).toEqual([]);
        });

        it("should handle edge case where all fields are at exact threshold", () => {
            const edgeRules: AchievementRules = {
                EDGE_RULE: {
                    id: "edge_rule",
                    type: "daily",
                    validator: (data) => data.steps === 5000,
                    points: 10,
                    metadata: { title: "Edge", icon: "🎯" },
                },
            };

            const userProgress: UserProgress = {
                steps: 5000,
                consecutiveDays: 0,
                weeklySteps: 5000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, edgeRules);
            expect(result).toHaveLength(1);
        });

        it("should handle validator returning false", () => {
            const falseRules: AchievementRules = {
                FALSE_RULE: {
                    id: "false_rule",
                    type: "daily",
                    validator: () => false,
                    points: 10,
                    metadata: { title: "False", icon: "❌" },
                },
            };

            const userProgress: UserProgress = {
                steps: 10000,
                consecutiveDays: 10,
                weeklySteps: 50000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, falseRules);
            expect(result).toEqual([]);
        });

        it("should handle validator with complex logic", () => {
            const complexRules: AchievementRules = {
                COMPLEX_RULE: {
                    id: "complex_rule",
                    type: "daily",
                    validator: (data) =>
                        data.steps >= 5000 &&
                        data.consecutiveDays >= 3 &&
                        data.weeklySteps >= 20000,
                    points: 100,
                    metadata: { title: "Complex", icon: "🏆" },
                },
            };

            const userProgress: UserProgress = {
                steps: 6000,
                consecutiveDays: 5,
                weeklySteps: 25000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, complexRules);
            expect(result).toHaveLength(1);
            expect(result[0].achievementId).toBe("complex_rule");
            expect(result[0].pointsEarned).toBe(100);
        });

        it("should handle zero values in userProgress", () => {
            const userProgress: UserProgress = {
                steps: 0,
                consecutiveDays: 0,
                weeklySteps: 0,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, mockRules);
            expect(result).toEqual([]);
        });

        it("should handle negative values in userProgress", () => {
            const userProgress: UserProgress = {
                steps: -100,
                consecutiveDays: -5,
                weeklySteps: -1000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, mockRules);
            expect(result).toEqual([]);
        });

        it("should handle very large numbers", () => {
            const userProgress: UserProgress = {
                steps: 1000000,
                consecutiveDays: 365,
                weeklySteps: 5000000,
                timestamp: "2024-02-09T12:00:00Z",
            };

            const result = evaluateAchievements(userProgress, mockRules);
            expect(result).toHaveLength(3);
        });
    });

    describe("filterNewAchievements", () => {
        it("should return all achievements when none exist", () => {
            const newAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
                {
                    achievementId: "achievement_2",
                    pointsEarned: 20,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const result = filterNewAchievements(newAchievements, []);
            expect(result).toHaveLength(2);
            expect(result).toEqual(newAchievements);
        });

        it("should filter out existing achievements", () => {
            const newAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
                {
                    achievementId: "achievement_2",
                    pointsEarned: 20,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
                {
                    achievementId: "achievement_3",
                    pointsEarned: 30,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const existingAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-08T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
                {
                    achievementId: "achievement_3",
                    pointsEarned: 30,
                    completedAt: "2024-02-07T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const result = filterNewAchievements(
                newAchievements,
                existingAchievements,
            );

            expect(result).toHaveLength(1);
            expect(result[0].achievementId).toBe("achievement_2");
        });

        it("should return empty array when all achievements already exist", () => {
            const newAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const existingAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-08T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const result = filterNewAchievements(
                newAchievements,
                existingAchievements,
            );
            expect(result).toEqual([]);
        });

        it("should handle empty new achievements array", () => {
            const existingAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-08T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const result = filterNewAchievements([], existingAchievements);
            expect(result).toEqual([]);
        });

        it("should handle both arrays empty", () => {
            const result = filterNewAchievements([], []);
            expect(result).toEqual([]);
        });

        it("should handle duplicate achievement IDs in existing achievements", () => {
            const newAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const existingAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-08T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-07T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const result = filterNewAchievements(
                newAchievements,
                existingAchievements,
            );
            expect(result).toEqual([]);
        });

        it("should preserve order of new achievements", () => {
            const newAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_3",
                    pointsEarned: 30,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test 3", icon: "🎯" },
                },
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test 1", icon: "🎯" },
                },
                {
                    achievementId: "achievement_2",
                    pointsEarned: 20,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test 2", icon: "🎯" },
                },
            ];

            const result = filterNewAchievements(newAchievements, []);

            expect(result[0].achievementId).toBe("achievement_3");
            expect(result[1].achievementId).toBe("achievement_1");
            expect(result[2].achievementId).toBe("achievement_2");
        });

        it("should handle case-sensitive achievement IDs", () => {
            const newAchievements: AchievementResult[] = [
                {
                    achievementId: "Achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-09T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const existingAchievements: AchievementResult[] = [
                {
                    achievementId: "achievement_1",
                    pointsEarned: 10,
                    completedAt: "2024-02-08T12:00:00Z",
                    metadata: { title: "Test", icon: "🎯" },
                },
            ];

            const result = filterNewAchievements(
                newAchievements,
                existingAchievements,
            );
            expect(result).toHaveLength(1);
        });
    });
});
