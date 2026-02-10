import { Router } from "express";
import controller from "@controllers/auth";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

// POST -> /auth/register
router.post("/register", controller.createNewUser);

// POST -> /auth/login
router.post("/login", controller.login);

// POST -> /auth/verify
router.post("/verify", authenticateJWT, controller.verifyEmail);

// POST -> /auth/forgot-password  (step 1: send reset code)
router.post("/forgot-password", controller.forgotPassword);

// POST -> /auth/verify-reset-code  (step 2: verify code, get token)
router.post("/verify-reset-code", controller.verifyResetCode);

// POST -> /auth/reset-password  (step 3: set new password — requires token from step 2)
router.post("/reset-password", authenticateJWT, controller.resetPassword);

export default router;
