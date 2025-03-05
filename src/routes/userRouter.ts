import { Router } from "express";
import { getUserInfo } from "@controllers/user";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateJWT, getUserInfo);

export default router;
