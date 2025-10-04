import { Router } from "express";
import { sendNewMessage, transcribeAudio } from "@controllers/chat";
import { authenticateJWT } from "@middlewares/authMiddleware";
import multer, { FileFilterCallback } from "multer";
import path from "path";

const router = Router();

// Multer storage
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `audio_${Date.now()}${ext}`);
    },
});

const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
) => {
    const allowedTypes = [
        "audio/flac",
        "audio/mp3",
        "audio/mpeg",
        "audio/mp4",
        "audio/m4a",
        "audio/ogg",
        "audio/opus",
        "audio/wav",
        "audio/webm",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid audio type"));
    }
};

const upload = multer({ storage, fileFilter });

router.post("/new-message", authenticateJWT, sendNewMessage);
router.post(
    "/transcribe",
    authenticateJWT,
    upload.single("audio"),
    transcribeAudio,
);

export default router;
