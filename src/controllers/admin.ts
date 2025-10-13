import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { Auth } from "@models/auth";
import User from "@models/user/user";
import { StatusCodes } from "http-status-codes";

export const loginAdmin: RequestMiddleware = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        Logger.error(`${StatusCodes.BAD_REQUEST}: Missing required fields`);
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Missing required fields" });
    }
    try {
        const auth = new Auth();
        const data = await auth.login(email, password, true);

        res.json({ token: data.token });
    } catch (error) {
        if (error instanceof Error) {
            Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);

            if (error.message === "Invalid credentials") {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    message: "Invalid email or password",
                });
            }

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: "Internal server error",
            });
        }
    }
};

export const me: RequestMiddleware = async (req, res) => {
    const user = req.user;
    if (!user) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ message: "Unauthorized" });
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

export default { loginAdmin, me };
