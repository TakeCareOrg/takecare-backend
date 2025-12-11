import { UserDB, UserHealthAttributionsDB } from "@database/models/user";
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
    try {
        const healthData = await UserHealthAttributionsDB.find({
            user_id: req.params.userId,
        }).select("-_id -__v -user_id -created_at");
        res.json(healthData[0]);
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const editUser: RequestMiddleware = async (req, res) => {
    const { userId } = req.params;
    const healthData = req.body.health;
    try {
        const userInstance = await UserDB.findOne({ user_id: userId });
        const userHealthInfo = await UserHealthAttributionsDB.findOne({
            user_id: userId,
        });

        if (!userInstance) {
            res.status(StatusCodes.NOT_FOUND).json({
                message: "User not found",
            });
            return;
        }
        if (!userHealthInfo) {
            res.status(StatusCodes.NOT_FOUND).json({
                message: "User health info not found",
            });
            return;
        }
        Promise.all([
            UserDB.updateOne({ user_id: userId }, req.body),
            UserHealthAttributionsDB.updateOne({ user_id: userId }, healthData),
        ]);
        res.json({ success: true });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export default { loginAdmin, me, getUsers, editUser, getHealthData };
