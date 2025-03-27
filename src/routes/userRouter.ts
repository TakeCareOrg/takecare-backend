import { Router } from "express";
import controller from "@controllers/user";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateJWT, controller.getUserInfo);

router.post("/health-quiz", authenticateJWT, controller.healthQuiz);

export default router;
