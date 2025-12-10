import { RequestMiddleware } from "@dtypes/express";
import User from "@models/user/user";

export const getUserInfo: RequestMiddleware = async (req, res) => {
    const user = req.user;

    if (!user) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    if (!user.user_id) {
        res.status(400).json({ message: "MISSING_USER_ID" });
        return;
    }

    try {
        const userInstance = new User(user.user_id);
        const userInfo = await userInstance.getUserInfo();

        if (!userInfo) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        console.log(`User info retrieved for user_id: ${user}`);

        res.json({ user: userInfo.user });
    } catch {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const healthQuiz: RequestMiddleware = async (req, res) => {
    const user = req.user;

    if (!user) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    const healthData = req.body;

    if (!healthData) {
        res.status(400).json({ message: "MISSING_HEALTH_DATA" });
        return;
    }

    try {
        const userInstance = new User(user.user_id);
        await userInstance.healthQuiz(healthData);

        res.status(200).json({ message: "Health quiz completed" });
    } catch {
        res.status(500).json({ message: "Internal server error" });
    }
};

export default { getUserInfo, healthQuiz };
