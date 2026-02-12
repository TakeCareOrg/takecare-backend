import { processUserSteps } from "../../../src/gamification/services/gamification-service";
import { UserDB } from "../../../src/database/models/user";

jest.mock("../../../src/database/models/user");

describe("gamificationService", () => {
    const mockUserDB = UserDB as jest.Mocked<typeof UserDB>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("processUserSteps", () => {
        it("should process new user with first achievement", async () => {
            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: [
                    {
                        date: new Date().toISOString(),
                        steps: 6000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 6000);

            expect(result.newAchievements.length).toBeGreaterThan(0);
            expect(result.pointsEarned).toBeGreaterThan(0);
            expect(result.currentStreak).toBe(1);
            expect(result.levelInfo.level).toBeGreaterThanOrEqual(0);
            expect(result.totalPoints).toBeGreaterThanOrEqual(0);
            expect(mockUserDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should not save when no new achievements and no streak bonus", async () => {
            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [
                        {
                            achievementId: "daily_steps_1k",
                            pointsEarned: 3,
                            completedAt: "2024-02-08T12:00:00Z",
                            metadata: { title: "Test", icon: "👟" },
                        },
                        {
                            achievementId: "daily_steps_2k",
                            pointsEarned: 5,
                            completedAt: "2024-02-08T12:00:00Z",
                            metadata: { title: "Test", icon: "👟" },
                        },
                        {
                            achievementId: "daily_steps_5k",
                            pointsEarned: 10,
                            completedAt: "2024-02-08T12:00:00Z",
                            metadata: { title: "Test", icon: "👟" },
                        },
                    ],
                    totalPoints: 10,
                },
                dailyActivities: [
                    {
                        date: new Date().toISOString(),
                        steps: 6000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            const result = await processUserSteps("user123", 6000);

            expect(result.newAchievements).toHaveLength(0);
            expect(result.pointsEarned).toBe(0);
            expect(result.totalPoints).toBe(10);
            expect(mockUserDB.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it("should award streak bonus for 7 consecutive days", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                return {
                    date: date.toISOString(),
                    steps: 6000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(7);
            expect(result.streakBonus).toBe(20);
            expect(result.pointsEarned).toBeGreaterThan(20);
            expect(mockUserDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should handle weekly challenge completion", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                return {
                    date: date.toISOString(),
                    steps: 7200,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 7200);

            const weeklyAchievement = result.newAchievements.find(
                (a) => a.achievementId === "weekly_challenge_50k",
            );
            expect(weeklyAchievement).toBeDefined();
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should level up user correctly", async () => {
            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 5,
                },
                dailyActivities: [
                    {
                        date: new Date().toISOString(),
                        steps: 6000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 6000);

            expect(result.totalPoints).toBeGreaterThanOrEqual(10);
            expect(result.levelInfo.level).toBeGreaterThanOrEqual(1);
            expect(mockUserDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should handle database errors gracefully", async () => {
            (mockUserDB.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest
                        .fn()
                        .mockRejectedValue(new Error("Database error")),
                }),
            });

            await expect(processUserSteps("user123", 6000)).rejects.toThrow(
                "Database error",
            );
        });

        it("should handle user with no previous activities", async () => {
            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: [],
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(0);
            expect(result.streakBonus).toBe(0);
            expect(result.totalPoints).toBeGreaterThanOrEqual(0);
            expect(mockUserDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should handle multiple achievements in single call", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                return {
                    date: date.toISOString(),
                    steps: 15000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 15000);

            expect(result.newAchievements.length).toBeGreaterThanOrEqual(4);
            expect(result.currentStreak).toBe(7);
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should calculate correct total points with bonus", async () => {
            const activities = Array.from({ length: 3 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                return {
                    date: date.toISOString(),
                    steps: 6000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(3);
            expect(result.streakBonus).toBe(5);
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should not award bonus for streak less than 3", async () => {
            const activities = Array.from({ length: 2 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                return {
                    date: date.toISOString(),
                    steps: 6000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(2);
            expect(result.streakBonus).toBe(0);
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should handle edge case with exact weekly steps threshold", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                return {
                    date: date.toISOString(),
                    steps: 7143,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 0,
                },
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 7143);

            const weeklyAchievement = result.newAchievements.find(
                (a) => a.achievementId === "weekly_challenge_50k",
            );
            expect(weeklyAchievement).toBeDefined();
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should handle user with existing achievements", async () => {
            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [
                        {
                            achievementId: "daily_steps_5k",
                            pointsEarned: 10,
                            completedAt: "2024-02-01T12:00:00Z",
                            metadata: { title: "5000 steps", icon: "" },
                        },
                    ],
                    totalPoints: 10,
                },
                dailyActivities: [
                    {
                        date: new Date().toISOString(),
                        steps: 10000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 10000);

            expect(result.newAchievements.length).toBeGreaterThan(0);
            const hasNew10kAchievement = result.newAchievements.some(
                (a) => a.achievementId === "daily_steps_10k",
            );
            expect(hasNew10kAchievement).toBe(true);
        });

        it("should correctly accumulate points over time", async () => {
            const mockUser = {
                user_id: "user123",
                gamification: {
                    achievements: [],
                    totalPoints: 50,
                },
                dailyActivities: [
                    {
                        date: new Date().toISOString(),
                        steps: 15000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock)
                .mockReturnValueOnce({
                    select: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockUser),
                    }),
                })
                .mockReturnValueOnce({
                    select: jest.fn().mockResolvedValue(mockUser),
                });

            (mockUserDB.findOneAndUpdate as jest.Mock).mockResolvedValue(
                undefined,
            );

            const result = await processUserSteps("user123", 15000);

            expect(result.totalPoints).toBeGreaterThan(50);
            expect(result.totalPoints).toBe(50 + result.pointsEarned);
        });
    });
});
