import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { Auth } from "@models/auth";
import { StatusCodes } from "http-status-codes";

const createNewUser: RequestMiddleware = async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    // Validate input
    if (!email || !password || !first_name || !last_name) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "Missing required fields" });
    }

    try {
        const auth = new Auth();
        const data = await auth.createNewUser(email, password);
        res.status(StatusCodes.CREATED).json({ token: data.token });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

const login: RequestMiddleware = async (req, res) => {
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

        res.json({ token: data.token });
    } catch (error: unknown) {
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

export { createNewUser, login };
