import { RequestMiddleware } from "@dtypes/express";

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

export { getUserInfo };
