import { Router } from "express";
import { sendNewMessage } from "@controllers/chat";
import { authenticateJWT } from "@middlewares/authMiddleware";

const router = Router();

router.post("/new-message", authenticateJWT, sendNewMessage);

export default router;
