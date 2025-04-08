import { RequestMiddleware } from "@dtypes/express";
import User from "@models/user/user";

const getUserInfo: RequestMiddleware = (req, res) => {
    const user = req.user;

    if (!user) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    try {
        res.json({ user: user });
    } catch {
        res.status(500).json({ message: "Internal server error" });
    }
};

const healthQuiz: RequestMiddleware = async (req, res) => {
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
