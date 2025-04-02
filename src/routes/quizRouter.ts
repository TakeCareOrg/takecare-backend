import { Router } from "express";
import controller from "@controllers/quiz-data";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

router.get("/:type", authenticateJWT, controller.getQuizData);

export default router;
