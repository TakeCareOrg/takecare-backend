import { RequestHandler } from "express";

const getUserInfo: RequestHandler = (req, res) => {
    const user = req.user;

    try {
        res.json({ user_id: user });
    } catch {
        res.status(500).json({ message: "Internal server error" });
    }
};

export { getUserInfo };
