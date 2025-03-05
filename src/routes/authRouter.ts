import { Router } from "express";
import { login, createNewUser } from "@controllers/auth";

const router = Router();

// POST -> /auth/register
router.post("/register", createNewUser);

// POST -> /auth/login
router.post("/login", login);

export default router;
