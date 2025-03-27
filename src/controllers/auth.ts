import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { Auth } from "@models/auth";

const createNewUser: RequestMiddleware = async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const auth = new Auth();
        const data = await auth.createNewUser(email, password);
        res.status(200).json({ token: data.token });
    } catch (error) {
        Logger.error(`Error 500: ${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

const login: RequestMiddleware = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        Logger.error(`400: Missing required fields`);
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const auth = new Auth();
        const data = await auth.login(email, password);

        res.json({ token: data.token });
    } catch (error) {
        Logger.error(`500: ${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

const verifyEmail: RequestMiddleware = async (req, res) => {
    const user = req.user;

    if (!user) {
        Logger.error(`401: Unauthorized`);
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { code } = req.body;

    if (!code) {
        Logger.error(`400: Missing required fields`);
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const auth = new Auth();
        const verified = await auth.verifyEmail(user.user_id, code);

        res.json({ verified });
    } catch (error) {
        Logger.error(`500: ${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

export default { createNewUser, login, verifyEmail };
