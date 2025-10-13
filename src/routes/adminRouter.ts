import { Router } from "express";
import controller from "@controllers/admin";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

// POST -> /admin/login
router.post("/login", controller.loginAdmin);

// GET -> /admin/me
router.get("/me", authenticateJWT, controller.me);

export default router;
