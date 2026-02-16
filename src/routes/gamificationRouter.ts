import { Router } from "express";
import controller from "@controllers/gamification";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

router.post("/steps", authenticateJWT, controller.syncSteps);
router.get("/progress", authenticateJWT, controller.getProgress);

export default router;
