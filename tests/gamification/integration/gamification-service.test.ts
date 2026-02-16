import { processUserSteps } from "../../../src/gamification/services/gamification-service";
import { UserDB } from "../../../src/database/models/user";
import { UserGamificationDB } from "../../../src/database/models/user_gamification";

jest.mock("../../../src/database/models/user");
jest.mock("../../../src/database/models/user_gamification");

describe("gamificationService", () => {
    const mockUserDB = UserDB as jest.Mocked<typeof UserDB>;
    const mockUserGamificationDB = UserGamificationDB as jest.Mocked<
        typeof UserGamificationDB
    >;

    const createMockQuery = (result: any) => {
        const mockQuery = {
            lean: jest.fn().mockResolvedValue(result),
            select: jest.fn(),
        };
        mockQuery.select.mockReturnValue(mockQuery);
        return mockQuery;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (mockUserGamificationDB.findOne as jest.Mock).mockImplementation(() =>
            createMockQuery(null),
        );
    });

    describe("processUserSteps", () => {
        it("should process new user with first achievement", async () => {
            const mockUser = {
                user_id: "user123",
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: [],
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );

            let callCount = 0;
            (mockUserGamificationDB.findOne as jest.Mock).mockImplementation(
                () => {
                    callCount++;
                    if (callCount <= 2) {
                        return createMockQuery(null);
                    }
                    return createMockQuery(mockGamification);
                },
            );

            (mockUserGamificationDB.create as jest.Mock).mockResolvedValue(
                mockGamification,
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 6000);

            expect(result.newAchievements.length).toBeGreaterThan(0);
            expect(result.pointsEarned).toBeGreaterThan(0);
            expect(result.currentStreak).toBe(0);
            expect(result.levelInfo.level).toBeGreaterThanOrEqual(0);
            expect(result.totalPoints).toBeGreaterThanOrEqual(0);
            expect(mockUserGamificationDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should not save when no new achievements and no streak bonus", async () => {
            const mockUser = {
                user_id: "user123",
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const mockGamification = {
                user_id: "user123",
                achievements: [
                    {
                        achievementId: "daily_steps_10",
                        pointsEarned: 1,
                        completedAt: "2024-02-08T12:00:00Z",
                        metadata: { title: "Test", icon: "👟" },
                    },
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
                dailyActivities: [
                    {
                        date: todayISO,
                        steps: 6000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );

            const result = await processUserSteps("user123", 6000);

            expect(result.newAchievements).toHaveLength(0);
            expect(result.pointsEarned).toBe(0);
            expect(result.totalPoints).toBe(10);
            expect(
                mockUserGamificationDB.findOneAndUpdate,
            ).not.toHaveBeenCalled();
        });

        it("should award streak bonus for 7 consecutive days", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                return {
                    date: date.toISOString(),
                    steps: 6000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
            };

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(7);
            expect(result.streakBonus).toBe(20);
            expect(result.pointsEarned).toBeGreaterThan(20);
            expect(mockUserGamificationDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should handle weekly challenge completion", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                return {
                    date: date.toISOString(),
                    steps: 7200,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
            };

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

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
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 5,
                dailyActivities: [
                    {
                        date: todayISO,
                        steps: 6000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 6000);

            expect(result.totalPoints).toBeGreaterThanOrEqual(10);
            expect(result.levelInfo.level).toBeGreaterThanOrEqual(1);
            expect(mockUserGamificationDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should handle database errors gracefully", async () => {
            (mockUserDB.findOne as jest.Mock).mockReturnValue({
                lean: jest.fn().mockRejectedValue(new Error("Database error")),
            });

            await expect(processUserSteps("user123", 6000)).rejects.toThrow(
                "Database error",
            );
        });

        it("should handle user with no previous activities", async () => {
            const mockUser = {
                user_id: "user123",
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: [],
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );

            let callCount = 0;
            (mockUserGamificationDB.findOne as jest.Mock).mockImplementation(
                () => {
                    callCount++;
                    if (callCount <= 2) {
                        return createMockQuery(null);
                    }
                    return createMockQuery(mockGamification);
                },
            );

            (mockUserGamificationDB.create as jest.Mock).mockResolvedValue(
                mockGamification,
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(0);
            expect(result.streakBonus).toBe(0);
            expect(result.totalPoints).toBeGreaterThanOrEqual(0);
            expect(mockUserGamificationDB.findOneAndUpdate).toHaveBeenCalled();
        });

        it("should handle multiple achievements in single call", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                return {
                    date: date.toISOString(),
                    steps: 15000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
            };

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 15000);

            expect(result.newAchievements.length).toBeGreaterThanOrEqual(4);
            expect(result.currentStreak).toBe(7);
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should calculate correct total points with bonus", async () => {
            const activities = Array.from({ length: 3 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                return {
                    date: date.toISOString(),
                    steps: 6000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
            };

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(3);
            expect(result.streakBonus).toBe(5);
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should not award bonus for streak less than 3", async () => {
            const activities = Array.from({ length: 2 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                return {
                    date: date.toISOString(),
                    steps: 6000,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
            };

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 6000);

            expect(result.currentStreak).toBe(2);
            expect(result.streakBonus).toBe(0);
            expect(result.pointsEarned).toBeGreaterThan(0);
        });

        it("should handle edge case with exact weekly steps threshold", async () => {
            const activities = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                return {
                    date: date.toISOString(),
                    steps: 7143,
                    completed: true,
                };
            });

            const mockUser = {
                user_id: "user123",
            };

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 0,
                dailyActivities: activities,
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

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
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const mockGamification = {
                user_id: "user123",
                achievements: [
                    {
                        achievementId: "daily_steps_5k",
                        pointsEarned: 10,
                        completedAt: "2024-02-01T12:00:00Z",
                        metadata: { title: "5000 steps", icon: "" },
                    },
                ],
                totalPoints: 10,
                dailyActivities: [
                    {
                        date: todayISO,
                        steps: 10000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

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
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const mockGamification = {
                user_id: "user123",
                achievements: [],
                totalPoints: 50,
                dailyActivities: [
                    {
                        date: todayISO,
                        steps: 15000,
                        completed: true,
                    },
                ],
            };

            (mockUserDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockUser),
            );
            (mockUserGamificationDB.findOne as jest.Mock).mockReturnValue(
                createMockQuery(mockGamification),
            );
            (
                mockUserGamificationDB.findOneAndUpdate as jest.Mock
            ).mockResolvedValue(undefined);

            const result = await processUserSteps("user123", 15000);

            expect(result.totalPoints).toBeGreaterThan(50);
            expect(result.totalPoints).toBe(50 + result.pointsEarned);
        });
    });
});
