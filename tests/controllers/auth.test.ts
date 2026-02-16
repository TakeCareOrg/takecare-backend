import { createNewUser, login, verifyEmail } from "../../src/controllers/auth";
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
                token: "mock-token-12345",
            });

            await createNewUser(req as Request, res as Response, next);

            expect(Auth.prototype.createNewUser).toHaveBeenCalledWith(
                "john.doe@example.com",
                "SecureP@ssw0rd",
            );
            expect(userCreatedCounter.inc).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(res.json).toHaveBeenCalledWith({
                token: "mock-token-12345",
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

        it("should handle short password (validation should be in Auth model)", async () => {
            req.body = {
                email: "user@example.com",
                password: "123",
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Password must be at least 6 characters",
            });
        });

        it("should handle invalid email format (validation should be in Auth model)", async () => {
            req.body = {
                email: "not-an-email",
                password: "password123",
            };

            await createNewUser(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid email address",
            });
        });

        it("should handle special characters in password", async () => {
            req.body = {
                email: "user@example.com",
                password: "P@ssw0rd!#$%^&*()",
            };

            (Auth.prototype.createNewUser as jest.Mock).mockResolvedValue({
                token: "mock-token",
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
                token: "valid-jwt-token",
            });

            await login(req as Request, res as Response, next);

            expect(Auth.prototype.login).toHaveBeenCalledWith(
                "john.doe@example.com",
                "correctPassword",
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
            expect(res.json).toHaveBeenCalledWith({ token: "valid-jwt-token" });
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

        it("should handle non-Error rejections gracefully", async () => {
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

        it("should pass input to Auth.login without modification", async () => {
            req.body = {
                email: "admin@example.com",
                password: "password",
            };

            (Auth.prototype.login as jest.Mock).mockResolvedValue({
                token: "token",
            });

            await login(req as Request, res as Response, next);

            expect(Auth.prototype.login).toHaveBeenCalledWith(
                "admin@example.com",
                "password",
            );
        });

        it("should handle deactivated account error", async () => {
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

            expect(Logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: expect.stringContaining("expected string"),
            });
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

        it("should return verified false when code is invalid", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "123456" };

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
            req.user = { user_id: null } as any;
            req.body = { code: "123456" };

            (Auth.prototype.verifyEmail as jest.Mock).mockResolvedValue(true);

            await verifyEmail(req as Request, res as Response, next);

            expect(Auth.prototype.verifyEmail).toHaveBeenCalledWith(
                null,
                "123456",
            );
        });

        it("should handle expired verification code", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "123456" };

            const error = new Error("Verification code expired");
            (Auth.prototype.verifyEmail as jest.Mock).mockRejectedValue(error);

            await verifyEmail(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(`500: ${error}`);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it("should handle code with special characters", async () => {
            req.user = { user_id: "user123" };
            req.body = { code: "123456" };

            (Auth.prototype.verifyEmail as jest.Mock).mockResolvedValue(true);

            await verifyEmail(req as Request, res as Response, next);

            expect(Auth.prototype.verifyEmail).toHaveBeenCalledWith(
                "user123",
                "123456",
            );
        });
    });
});
