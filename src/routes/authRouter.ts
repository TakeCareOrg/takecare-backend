import { Router } from "express";
import controller from "@controllers/auth";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

// POST -> /auth/register
router.post("/register", controller.createNewUser);

// POST -> /auth/login
router.post("/login", controller.login);

router.post("/verify", authenticateJWT, controller.verifyEmail);

export default router;
