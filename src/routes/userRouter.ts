import { Router } from "express";
import controller from "@controllers/user";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

router.get("/me", authenticateJWT, controller.getUserInfo);

router.post("/health-quiz", authenticateJWT, controller.healthQuiz);

router.patch("/health-data", authenticateJWT, controller.updateHealthData);

export default router;
