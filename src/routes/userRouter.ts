import { Router } from "express";
import controller from "@controllers/user";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

router
    .route("/me")
    .get(authenticateJWT, controller.getUserInfo)
    .patch(authenticateJWT, controller.updateUserInfo);

router.post("/health-quiz", authenticateJWT, controller.healthQuiz);

router.patch("/health-data", authenticateJWT, controller.updateHealthData);

export default router;
