import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { Auth } from "@models/auth";
import { StatusCodes } from "http-status-codes";
import { userCreatedCounter } from "@config/metrics";
import {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    verifyResetCodeSchema,
    resetPasswordSchema,
    refreshTokenSchema,
} from "@validators/auth";

export const createNewUser: RequestMiddleware = async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;

    try {
        const auth = new Auth();
        const data = await auth.createNewUser(email, password);
        userCreatedCounter.inc();
        res.status(StatusCodes.CREATED).json({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const login: RequestMiddleware = async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
        Logger.error(
            `${StatusCodes.BAD_REQUEST}: ${parsed.error.issues[0].message}`,
        );
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;

    try {
        const auth = new Auth();
        const data = await auth.login(email, password);

        res.status(StatusCodes.OK).json({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });
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
        Logger.error("401: Unauthorized");
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ message: "Unauthorized" });
    }

    const parsed = verifyEmailSchema.safeParse(req.body);

    if (!parsed.success) {
        Logger.error(`400: ${parsed.error.issues[0].message}`);
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { code } = parsed.data;

    try {
        const auth = new Auth();
        const verified = await auth.verifyEmail(user.user_id, code);

        res.json({ verified });
    } catch (error) {
        Logger.error(`500: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const forgotPassword: RequestMiddleware = async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
        Logger.error(
            `${StatusCodes.BAD_REQUEST}: ${parsed.error.issues[0].message}`,
        );
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { email } = parsed.data;

    try {
        const auth = new Auth();
        await auth.forgotPassword(email);

        // Always return success to prevent user enumeration
        res.status(StatusCodes.OK).json({
            message:
                "If an account with that email exists, a reset code has been sent",
        });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const verifyResetCode: RequestMiddleware = async (req, res) => {
    const parsed = verifyResetCodeSchema.safeParse(req.body);

    if (!parsed.success) {
        Logger.error(
            `${StatusCodes.BAD_REQUEST}: ${parsed.error.issues[0].message}`,
        );
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { email, code } = parsed.data;

    try {
        const auth = new Auth();
        const data = await auth.verifyResetCode(email, code);

        res.status(StatusCodes.OK).json({ token: data.token });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_CODE") {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ message: "Invalid or expired reset code" });
        }

        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const resetPassword: RequestMiddleware = async (req, res) => {
    const user = req.user;

    if (!user) {
        Logger.error("401: Unauthorized");
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ message: "Unauthorized" });
    }

    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
        Logger.error(
            `${StatusCodes.BAD_REQUEST}: ${parsed.error.issues[0].message}`,
        );
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { password } = parsed.data;

    try {
        const auth = new Auth();
        await auth.resetPassword(user.user_id, password);

        res.status(StatusCodes.OK).json({
            message: "Password has been reset successfully",
        });
    } catch (error) {
        if (error instanceof Error && error.message === "USER_NOT_FOUND") {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "User not found" });
        }

        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const refresh: RequestMiddleware = async (req, res) => {
    const parsed = refreshTokenSchema.safeParse(req.body);

    if (!parsed.success) {
        Logger.error(
            `${StatusCodes.BAD_REQUEST}: ${parsed.error.issues[0].message}`,
        );
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { refreshToken } = parsed.data;

    try {
        const auth = new Auth();
        const data = await auth.refreshAccessToken(refreshToken);

        res.status(StatusCodes.OK).json({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (
                error.message === "TOKEN_REVOKED" ||
                error.message === "INVALID_REFRESH_TOKEN"
            ) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    message: "Invalid or expired refresh token",
                });
            }
        }

        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export const logout: RequestMiddleware = async (req, res) => {
    const parsed = refreshTokenSchema.safeParse(req.body);

    if (!parsed.success) {
        Logger.error(
            `${StatusCodes.BAD_REQUEST}: ${parsed.error.issues[0].message}`,
        );
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: parsed.error.issues[0].message });
    }

    const { refreshToken } = parsed.data;

    try {
        const auth = new Auth();
        await auth.logout(refreshToken);

        res.status(StatusCodes.OK).json({
            message: "Logged out successfully",
        });
    } catch (error) {
        Logger.error(`${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error",
        });
    }
};

export default {
    createNewUser,
    login,
    verifyEmail,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    refresh,
    logout,
};
