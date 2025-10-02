import { Router } from "express";
import { register } from "../config/metrics";

const router = Router();

router.get("/", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
});

export default router;
