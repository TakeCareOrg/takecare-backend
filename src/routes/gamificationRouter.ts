import express, { Request, Response } from "express";
import { processUserSteps } from "../gamification/services/gamification-service";
import { determineLevel } from "../gamification/core/engine/level-system";
import { fetchUserGamificationData } from "../gamification/adapters/db-adapter";

const router = express.Router();

interface StepsRequestBody {
    userId: string;
    steps: number;
}

router.post(
    "/steps",
    async (
        req: Request<object, object, StepsRequestBody>,
        res: Response,
    ): Promise<void> => {
        try {
            const { userId, steps } = req.body;

            if (!userId || typeof steps !== "number") {
                res.status(400).json({ error: "Invalid request body" });
                return;
            }

            const result = await processUserSteps(userId, steps);

            res.json({
                success: true,
                data: {
                    newAchievements: result.newAchievements,
                    pointsEarned: result.pointsEarned,
                    currentStreak: result.currentStreak,
                    streakBonus: result.streakBonus,
                    levelInfo: result.levelInfo,
                    totalPoints: result.totalPoints,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: (error as Error).message,
            });
        }
    },
);

router.get("/progress/:userId", async (req: Request, res: Response) => {
    try {
        const userData = await fetchUserGamificationData(req.params.userId);
        const levelInfo = determineLevel(userData.totalPoints);

        res.json({
            success: true,
            data: {
                achievements: userData.achievements,
                totalPoints: userData.totalPoints,
                levelInfo,
                dailyActivities: userData.dailyActivities,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

export default router;
