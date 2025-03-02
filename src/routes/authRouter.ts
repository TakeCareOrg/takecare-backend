import { Router } from "express";
import { login, register } from "@controllers/auth";

const router = Router();

// POST -> /auth/register
router.post("/register", register);

// POST -> /auth/login
router.post("/login", login);

export default router;
