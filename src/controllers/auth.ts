import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { Auth } from "@models/auth";
import { StatusCodes } from "http-status-codes";
import { userCreatedCounter } from "../config/metrics";

export const createNewUser: RequestMiddleware = async (req, res) => {
    const { email, password } = req.body;

    // Validate input

    if (!email || !password) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Missing required fields" });
    }

    try {
        const auth = new Auth();
        const data = await auth.createNewUser(email, password);
        userCreatedCounter.inc();
        res.status(StatusCodes.CREATED).json({ token: data.token });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const login: RequestMiddleware = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        Logger.error(`${StatusCodes.BAD_REQUEST}: Missing required fields`);
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Missing required fields" });
    }

    try {
        const auth = new Auth();
        const data = await auth.login(email, password);

        res.status(StatusCodes.OK).json({ token: data.token });
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

export const verifyEmail: RequestMiddleware = async (req, res) => {
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
