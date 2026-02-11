import { UserDB } from "@database/models/user";
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

        res.json({ user: userInfo.user });
    } catch {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getUsers: RequestMiddleware = async (req, res) => {
    try {
        const users = await UserDB.find().select("-password -_id -__v");
        res.json({ users });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const getHealthData: RequestMiddleware = async (req, res) => {
    const { userId } = req.params;
    if (!userId || typeof userId !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({
            message: "Invalid userId",
        });
        return;
    }

    try {
        const userInstance = new User(userId);

        const healthData = await userInstance.getHealthData();
        res.json(healthData);
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const editUser: RequestMiddleware = async (req, res) => {
    const { userId } = req.params;
    const modifiedUser = req.body;
    if (!userId || typeof userId !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({
            message: "Invalid userId",
        });
        return;
    }

    try {
        const userInstance = new User(userId);

        if (!userInstance) {
            res.status(StatusCodes.NOT_FOUND).json({
                message: "User not found",
            });
            return;
        }
        if (!modifiedUser) {
            res.status(StatusCodes.BAD_REQUEST).json({
                message: "Missing user in request",
            });
            return;
        }
        await userInstance.updateHealthData(modifiedUser);
        res.json({ success: true });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export default { loginAdmin, me, getUsers, editUser, getHealthData };
