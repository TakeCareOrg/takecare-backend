// /tests/core/level-system.test.ts
import {
    determineLevel,
    getLevelConfig,
} from "../../../src/gamification/core/engine/level-system";

describe("levelSystem", () => {
    describe("determineLevel", () => {
        it("should return level 0 (Débutant) for 0 points", () => {
            const result = determineLevel(0);
            expect(result.level).toBe(0);
            expect(result.title).toBe("Débutant");
            expect(result.currentPoints).toBe(0);
            expect(result.pointsForCurrentLevel).toBe(0);
            expect(result.pointsForNextLevel).toBe(10);
            expect(result.progressToNextLevel).toBe(0);
        });

        it("should return level 0 (Débutant) for 5 points", () => {
            const result = determineLevel(5);
            expect(result.level).toBe(0);
            expect(result.title).toBe("Débutant");
            expect(result.pointsForNextLevel).toBe(10);
            expect(result.progressToNextLevel).toBe(50);
        });

        it("should return level 0 (Débutant) for 9 points", () => {
            const result = determineLevel(9);
            expect(result.level).toBe(0);
            expect(result.title).toBe("Débutant");
            expect(result.progressToNextLevel).toBe(90);
        });

        it("should return level 1 (Novice) for 10 points", () => {
            const result = determineLevel(10);
            expect(result.level).toBe(1);
            expect(result.title).toBe("Novice");
            expect(result.pointsForCurrentLevel).toBe(10);
            expect(result.pointsForNextLevel).toBe(20);
            expect(result.progressToNextLevel).toBe(0);
        });

        it("should return level 1 (Novice) for 15 points", () => {
            const result = determineLevel(15);
            expect(result.level).toBe(1);
            expect(result.title).toBe("Novice");
            expect(result.progressToNextLevel).toBe(50);
        });

        it("should return level 2 (Intermédiaire) for 20 points", () => {
            const result = determineLevel(20);
            expect(result.level).toBe(2);
            expect(result.title).toBe("Intermédiaire");
            expect(result.pointsForCurrentLevel).toBe(20);
            expect(result.pointsForNextLevel).toBe(50);
        });

        it("should return level 5 (Maître) for 200 points", () => {
            const result = determineLevel(200);
            expect(result.level).toBe(5);
            expect(result.title).toBe("Maître");
        });

        it("should return level 8 (Elite) for 1000 points", () => {
            const result = determineLevel(1000);
            expect(result.level).toBe(8);
            expect(result.title).toBe("Elite");
            expect(result.pointsForNextLevel).toBeNull();
            expect(result.progressToNextLevel).toBe(100);
        });

        it("should return level 8 (Elite) for 5000 points", () => {
            const result = determineLevel(5000);
            expect(result.level).toBe(8);
            expect(result.title).toBe("Elite");
            expect(result.pointsForNextLevel).toBeNull();
            expect(result.progressToNextLevel).toBe(100);
        });

        it("should calculate correct progress percentage", () => {
            const result = determineLevel(15);
            expect(result.progressToNextLevel).toBe(50);
        });

        it("should throw error for negative points", () => {
            expect(() => determineLevel(-10)).toThrow(
                "Invalid totalPoints: must be a non-negative number",
            );
        });

        it("should return level 0 for NaN (treated as 0)", () => {
            const result = determineLevel(0);
            expect(result.level).toBe(0);
        });

        it("should throw error for string", () => {
            expect(() => determineLevel("100" as any)).toThrow(
                "Invalid totalPoints: must be a non-negative number",
            );
        });

        it("should throw error for null", () => {
            expect(() => determineLevel(null as any)).toThrow(
                "Invalid totalPoints: must be a non-negative number",
            );
        });

        it("should throw error for undefined", () => {
            expect(() => determineLevel(undefined as any)).toThrow(
                "Invalid totalPoints: must be a non-negative number",
            );
        });

        it("should throw error for object", () => {
            expect(() => determineLevel({} as any)).toThrow(
                "Invalid totalPoints: must be a non-negative number",
            );
        });

        it("should handle decimal points correctly", () => {
            const result = determineLevel(15.75);
            expect(result.level).toBe(1);
            expect(result.currentPoints).toBe(15.75);
        });
    });

    describe("getLevelConfig", () => {
        it("should return level configuration", () => {
            const config = getLevelConfig();
            expect(config.thresholds).toHaveLength(9);
            expect(config.titles).toHaveLength(10);
        });

        it("should return correct thresholds", () => {
            const config = getLevelConfig();
            expect(config.thresholds).toEqual([
                0, 10, 20, 50, 100, 200, 400, 700, 1000,
            ]);
        });

        it("should return correct titles", () => {
            const config = getLevelConfig();
            expect(config.titles).toEqual([
                "Débutant",
                "Novice",
                "Intermédiaire",
                "Confirmé",
                "Expert",
                "Maître",
                "Champion",
                "Légende",
                "Elite",
                "Grand Maître",
            ]);
        });
    });
});
