import {
    createNewUser,
    login,
    verifyEmail,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    refresh,
    logout,
} from "../../src/controllers/auth";
import { Auth } from "../../src/models/auth";
import Logger from "../../src/libs/logger";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { userCreatedCounter } from "../../src/config/metrics";

jest.mock("../../src/models/auth");
jest.mock("../../src/libs/logger");
jest.mock("../../src/config/metrics", () => ({
    userCreatedCounter: {
        inc: jest.fn(),
    },
}));

describe("User Authentication Tests", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let status: jest.Mock;
    let json: jest.Mock;

    beforeEach(() => {
        req = { body: {}, user: undefined };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        status = jest.fn().mockReturnThis();
        json = jest.fn().mockReturnThis();
        res.status = status;
        res.json = json;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("createNewUser", () => {
        it("should return CREATED and token if user is created successfully", async () => {
            req.body = {
                email: "john.doe@example.com",
                password: "SecureP@ssw0rd",
            };
            (Auth.prototype.createNewUser as jest.Mock).mockResolvedValue({
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token",
            });

            await createNewUser(req as Request, res as Response, next);

            expect(Auth.prototype.createNewUser).toHaveBeenCalledWith(
                "john.doe@example.com",
                "SecureP@ssw0rd",
            );
            expect(userCreatedCounter.inc).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(res.json).toHaveBeenCalledWith({
                accessToken: "mock-access-token",
                refreshToken: "mock-refresh-token",
            });
        });

        it("should return BAD_REQUEST if email is missing", async () => {
            req.body = {
                email: "",
                password: "password123",
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid email address",
            });
            expect(Auth.prototype.createNewUser).not.toHaveBeenCalled();
            expect(userCreatedCounter.inc).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if password is missing", async () => {
            req.body = {
                email: "user@example.com",
                password: "",
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Password must be at least 6 characters",
            });
            expect(userCreatedCounter.inc).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if both fields are missing", async () => {
            req.body = {};

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid email address",
            });
        });

        it("should return BAD_REQUEST if email is null", async () => {
            req.body = {
                email: null,
                password: "password123",
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
        });

        it("should return BAD_REQUEST if password is null", async () => {
            req.body = {
                email: "user@example.com",
                password: null,
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
        });

        it("should return INTERNAL_SERVER_ERROR if there is a database error", async () => {
            req.body = {
                email: "user@example.com",
                password: "password123",
            };

            (Auth.prototype.createNewUser as jest.Mock).mockRejectedValue(
                new Error("Database connection failed"),
            );

            await createNewUser(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: Database connection failed`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
            expect(userCreatedCounter.inc).not.toHaveBeenCalled();
        });

        it("should return INTERNAL_SERVER_ERROR if email already exists", async () => {
            req.body = {
                email: "existing@example.com",
                password: "password123",
            };

            (Auth.prototype.createNewUser as jest.Mock).mockRejectedValue(
                new Error("Email already exists"),
            );

            await createNewUser(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
        });

        it("should return BAD_REQUEST for short password", async () => {
            req.body = {
                email: "user@example.com",
                password: "123",
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Password must be at least 6 characters",
            });
            expect(Auth.prototype.createNewUser).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST for invalid email format", async () => {
            req.body = {
                email: "not-an-email",
                password: "password123",
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid email address",
            });
            expect(Auth.prototype.createNewUser).not.toHaveBeenCalled();
        });

        it("should handle special characters in password", async () => {
            req.body = {
                email: "user@example.com",
                password: "P@ssw0rd!#$%^&*()",
            };

            (Auth.prototype.createNewUser as jest.Mock).mockResolvedValue({
                accessToken: "mock-access",
                refreshToken: "mock-refresh",
            });

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(userCreatedCounter.inc).toHaveBeenCalled();
        });
    });

    describe("login", () => {
        it("should return OK and token if login is successful", async () => {
            req.body = {
                email: "john.doe@example.com",
                password: "correctPassword",
            };

            (Auth.prototype.login as jest.Mock).mockResolvedValue({
                accessToken: "valid-access-token",
                refreshToken: "valid-refresh-token",
            });

            await login(req as Request, res as Response, next);

            expect(Auth.prototype.login).toHaveBeenCalledWith(
                "john.doe@example.com",
                "correctPassword",
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({
                accessToken: "valid-access-token",
                refreshToken: "valid-refresh-token",
            });
        });

        it("should return BAD_REQUEST if email is missing", async () => {
            req.body = { email: "", password: "password" };

            await login(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.BAD_REQUEST}: Invalid email address`,
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid email address",
            });
            expect(Auth.prototype.login).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if password is missing", async () => {
            req.body = { email: "user@example.com", password: "" };

            await login(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.BAD_REQUEST}: Password is required`,
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
        });

        it("should return BAD_REQUEST if both fields are missing", async () => {
            req.body = {};

            await login(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
        });

        it("should return INTERNAL_SERVER_ERROR for generic errors", async () => {
            req.body = {
                email: "john.doe@example.com",
                password: "wrongpassword",
            };

            const error = new Error("AN_ERROR_OCCURRED");
            (Auth.prototype.login as jest.Mock).mockRejectedValue(error);

            await login(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: AN_ERROR_OCCURRED`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should return INTERNAL_SERVER_ERROR if there is a database error", async () => {
            req.body = {
                email: "john.doe@example.com",
                password: "password",
            };

            (Auth.prototype.login as jest.Mock).mockRejectedValue(
                new Error("Database error"),
            );

            await login(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: Database error`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should return BAD_REQUEST if email is null", async () => {
            req.body = {
                email: null,
                password: "password123",
            };

            await login(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
        });

        it("should not call Logger when rejection is not an Error instance", async () => {
            req.body = {
                email: "user@example.com",
                password: "password",
            };

            (Auth.prototype.login as jest.Mock).mockRejectedValue(
                "String error",
            );

            await login(req as Request, res as Response, next);

            expect(Logger.error).not.toHaveBeenCalled();
        });

        it("should reject SQL injection attempts via email validation", async () => {
            req.body = {
                email: "admin'--",
                password: "password",
            };

            await login(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.login).not.toHaveBeenCalled();
        });

        it("should return UNAUTHORIZED when credentials are invalid", async () => {
            req.body = {
                email: "user@example.com",
                password: "wrongpassword",
            };

            const error = new Error("Invalid credentials");
            (Auth.prototype.login as jest.Mock).mockRejectedValue(error);

            await login(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid email or password",
            });
        });

        it("should return INTERNAL_SERVER_ERROR for non-credentials errors", async () => {
            req.body = {
                email: "deactivated@example.com",
                password: "password",
            };

            const error = new Error("Account deactivated");
            (Auth.prototype.login as jest.Mock).mockRejectedValue(error);

            await login(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
        });

        it("should handle multiple login attempts", async () => {
            const attempts = 5;

            for (let i = 0; i < attempts; i++) {
                req.body = {
                    email: "user@example.com",
                    password: `wrongpassword${i}`,
                };

                const error = new Error("Invalid credentials");
                (Auth.prototype.login as jest.Mock).mockRejectedValue(error);

                await login(req as Request, res as Response, next);

                expect(res.status).toHaveBeenCalledWith(
                    StatusCodes.UNAUTHORIZED,
                );
                jest.clearAllMocks();
            }
        });
    });

    describe("verifyEmail", () => {
        it("should verify email successfully with valid code", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "123456" };

            (Auth.prototype.verifyEmail as jest.Mock).mockResolvedValue(true);

            await verifyEmail(req as Request, res as Response, next);

            expect(Auth.prototype.verifyEmail).toHaveBeenCalledWith(
                "user123",
                "123456",
            );
            expect(res.json).toHaveBeenCalledWith({ verified: true });
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return 401 when user is not authenticated", async () => {
            req.user = undefined;
            req.body = { code: "123456" };

            await verifyEmail(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith("401: Unauthorized");
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
            expect(Auth.prototype.verifyEmail).not.toHaveBeenCalled();
        });

        it("should return 400 when verification code is missing", async () => {
            req.user = { user_id: "user123" };
            req.body = {};

            await verifyEmail(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should return 400 when code is empty string", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "" };

            await verifyEmail(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return 400 when code is null", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: null };

            await verifyEmail(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should return BAD_REQUEST when code format is invalid", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "wrong-code" };

            await verifyEmail(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(Auth.prototype.verifyEmail).not.toHaveBeenCalled();
        });

        it("should return verified false when code does not match", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "999999" };

            (Auth.prototype.verifyEmail as jest.Mock).mockResolvedValue(false);

            await verifyEmail(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({ verified: false });
        });

        it("should return 500 on internal server error", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "123456" };

            const error = new Error("Database error");
            (Auth.prototype.verifyEmail as jest.Mock).mockRejectedValue(error);

            await verifyEmail(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(`500: ${error}`);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should handle null user_id", async () => {
            req.user = { user_id: null } as never;
            req.body = { code: "123456" };

            (Auth.prototype.verifyEmail as jest.Mock).mockResolvedValue(true);

            await verifyEmail(req as Request, res as Response, next);

            expect(Auth.prototype.verifyEmail).toHaveBeenCalledWith(
                null,
                "123456",
            );
        });

        it("should return 500 when verification code is expired", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "111111" };

            const error = new Error("Verification code expired");
            (Auth.prototype.verifyEmail as jest.Mock).mockRejectedValue(error);

            await verifyEmail(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(`500: ${error}`);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it("should reject code with special characters", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "12-34-56" };

            await verifyEmail(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(Auth.prototype.verifyEmail).not.toHaveBeenCalled();
        });

        it("should reject numeric code as number type", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: 123456 };

            await verifyEmail(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(Auth.prototype.verifyEmail).not.toHaveBeenCalled();
        });
    });

    describe("forgotPassword", () => {
        it("should return OK with success message for valid email", async () => {
            req.body = { email: "user@example.com" };

            (Auth.prototype.forgotPassword as jest.Mock).mockResolvedValue(
                undefined,
            );

            await forgotPassword(req as Request, res as Response, next);

            expect(Auth.prototype.forgotPassword).toHaveBeenCalledWith(
                "user@example.com",
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({
                message:
                    "If an account with that email exists, a reset code has been sent",
            });
        });

        it("should return OK even when email does not exist", async () => {
            req.body = { email: "unknown@example.com" };

            (Auth.prototype.forgotPassword as jest.Mock).mockResolvedValue(
                undefined,
            );

            await forgotPassword(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({
                message:
                    "If an account with that email exists, a reset code has been sent",
            });
        });

        it("should return BAD_REQUEST if email is missing", async () => {
            req.body = {};

            await forgotPassword(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.forgotPassword).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if email is invalid", async () => {
            req.body = { email: "not-an-email" };

            await forgotPassword(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Logger.error).toHaveBeenCalled();
            expect(Auth.prototype.forgotPassword).not.toHaveBeenCalled();
        });

        it("should return INTERNAL_SERVER_ERROR on unexpected error", async () => {
            req.body = { email: "user@example.com" };

            (Auth.prototype.forgotPassword as jest.Mock).mockRejectedValue(
                new Error("Mail service down"),
            );

            await forgotPassword(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: Mail service down`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });
    });

    describe("verifyResetCode", () => {
        it("should return OK with token on valid code", async () => {
            req.body = { email: "user@example.com", code: "123456" };

            (Auth.prototype.verifyResetCode as jest.Mock).mockResolvedValue({
                token: "reset-token-abc",
            });

            await verifyResetCode(req as Request, res as Response, next);

            expect(Auth.prototype.verifyResetCode).toHaveBeenCalledWith(
                "user@example.com",
                "123456",
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({ token: "reset-token-abc" });
        });

        it("should return BAD_REQUEST if email is missing", async () => {
            req.body = { code: "123456" };

            await verifyResetCode(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.verifyResetCode).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if code is missing", async () => {
            req.body = { email: "user@example.com" };

            await verifyResetCode(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.verifyResetCode).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST when model throws INVALID_CODE", async () => {
            req.body = { email: "user@example.com", code: "000000" };

            (Auth.prototype.verifyResetCode as jest.Mock).mockRejectedValue(
                new Error("INVALID_CODE"),
            );

            await verifyResetCode(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid or expired reset code",
            });
        });

        it("should return INTERNAL_SERVER_ERROR on unexpected error", async () => {
            req.body = { email: "user@example.com", code: "123456" };

            (Auth.prototype.verifyResetCode as jest.Mock).mockRejectedValue(
                new Error("DB error"),
            );

            await verifyResetCode(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: DB error`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should return BAD_REQUEST for invalid email format", async () => {
            req.body = { email: "bad-email", code: "123456" };

            await verifyResetCode(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.verifyResetCode).not.toHaveBeenCalled();
        });
    });

    describe("resetPassword", () => {
        it("should reset password successfully", async () => {
            req.user = { user_id: "user123" };
            req.body = { password: "NewSecureP@ss1" };

            (Auth.prototype.resetPassword as jest.Mock).mockResolvedValue(
                undefined,
            );

            await resetPassword(req as Request, res as Response, next);

            expect(Auth.prototype.resetPassword).toHaveBeenCalledWith(
                "user123",
                "NewSecureP@ss1",
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({
                message: "Password has been reset successfully",
            });
        });

        it("should return 401 when user is not authenticated", async () => {
            req.user = undefined;
            req.body = { password: "NewSecureP@ss1" };

            await resetPassword(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith("401: Unauthorized");
            expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
            expect(Auth.prototype.resetPassword).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if password is missing", async () => {
            req.user = { user_id: "user123" };
            req.body = {};

            await resetPassword(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.resetPassword).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if password is too short", async () => {
            req.user = { user_id: "user123" };
            req.body = { password: "123" };

            await resetPassword(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.resetPassword).not.toHaveBeenCalled();
        });

        it("should return NOT_FOUND when model throws USER_NOT_FOUND", async () => {
            req.user = { user_id: "user123" };
            req.body = { password: "NewSecureP@ss1" };

            (Auth.prototype.resetPassword as jest.Mock).mockRejectedValue(
                new Error("USER_NOT_FOUND"),
            );

            await resetPassword(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found",
            });
        });

        it("should return INTERNAL_SERVER_ERROR on unexpected error", async () => {
            req.user = { user_id: "user123" };
            req.body = { password: "NewSecureP@ss1" };

            (Auth.prototype.resetPassword as jest.Mock).mockRejectedValue(
                new Error("DB error"),
            );

            await resetPassword(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: DB error`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });
    });

    describe("refresh", () => {
        it("should return new tokens on valid refresh token", async () => {
            req.body = { refreshToken: "valid-refresh-token" };

            (Auth.prototype.refreshAccessToken as jest.Mock).mockResolvedValue({
                accessToken: "new-access-token",
                refreshToken: "new-refresh-token",
            });

            await refresh(req as Request, res as Response, next);

            expect(Auth.prototype.refreshAccessToken).toHaveBeenCalledWith(
                "valid-refresh-token",
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({
                accessToken: "new-access-token",
                refreshToken: "new-refresh-token",
            });
        });

        it("should return BAD_REQUEST if refreshToken is missing", async () => {
            req.body = {};

            await refresh(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.refreshAccessToken).not.toHaveBeenCalled();
        });

        it("should return UNAUTHORIZED when token is revoked", async () => {
            req.body = { refreshToken: "revoked-token" };

            (Auth.prototype.refreshAccessToken as jest.Mock).mockRejectedValue(
                new Error("TOKEN_REVOKED"),
            );

            await refresh(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid or expired refresh token",
            });
        });

        it("should return UNAUTHORIZED when token is invalid", async () => {
            req.body = { refreshToken: "bad-token" };

            (Auth.prototype.refreshAccessToken as jest.Mock).mockRejectedValue(
                new Error("INVALID_REFRESH_TOKEN"),
            );

            await refresh(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid or expired refresh token",
            });
        });

        it("should return INTERNAL_SERVER_ERROR on unexpected error", async () => {
            req.body = { refreshToken: "valid-refresh-token" };

            (Auth.prototype.refreshAccessToken as jest.Mock).mockRejectedValue(
                new Error("DB error"),
            );

            await refresh(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: DB error`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should return INTERNAL_SERVER_ERROR when rejection is not an Error instance", async () => {
            req.body = { refreshToken: "valid-refresh-token" };

            (Auth.prototype.refreshAccessToken as jest.Mock).mockRejectedValue(
                "string error",
            );

            await refresh(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
        });
    });

    describe("logout", () => {
        it("should logout successfully with valid refresh token", async () => {
            req.body = { refreshToken: "valid-refresh-token" };

            (Auth.prototype.logout as jest.Mock).mockResolvedValue(undefined);

            await logout(req as Request, res as Response, next);

            expect(Auth.prototype.logout).toHaveBeenCalledWith(
                "valid-refresh-token",
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({
                message: "Logged out successfully",
            });
        });

        it("should return BAD_REQUEST if refreshToken is missing", async () => {
            req.body = {};

            await logout(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.logout).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST if refreshToken is empty string", async () => {
            req.body = { refreshToken: "" };

            await logout(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(Auth.prototype.logout).not.toHaveBeenCalled();
        });

        it("should return INTERNAL_SERVER_ERROR on unexpected error", async () => {
            req.body = { refreshToken: "valid-refresh-token" };

            (Auth.prototype.logout as jest.Mock).mockRejectedValue(
                new Error("DB error"),
            );

            await logout(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: Error: DB error`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });
    });
});
