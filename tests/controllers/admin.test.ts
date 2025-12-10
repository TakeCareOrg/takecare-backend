import { loginAdmin, me, getUsers } from "../../src/controllers/admin";
import { Auth } from "../../src/models/auth";
import User from "../../src/models/user/user";
import { UserDB } from "../../src/database/models/user";
import Logger from "../../src/libs/logger";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

jest.mock("../../src/models/auth");
jest.mock("../../src/models/user/user");
jest.mock("../../src/database/models/user");
jest.mock("../../src/libs/logger");

describe("Admin Controller Tests", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let status: jest.Mock;
    let json: jest.Mock;

    beforeEach(() => {
        req = {
            body: {},
            user: undefined,
        };
        status = jest.fn().mockReturnThis();
        json = jest.fn().mockReturnThis();
        res = {
            status,
            json,
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe("loginAdmin", () => {
        it("should login admin successfully with valid credentials", async () => {
            req.body = {
                email: "admin@example.com",
                password: "adminPassword123",
            };

            const mockToken = "admin-jwt-token";
            (Auth.prototype.login as jest.Mock).mockResolvedValue({
                token: mockToken,
            });

            await loginAdmin(req as Request, res as Response, next);

            expect(Auth.prototype.login).toHaveBeenCalledWith(
                "admin@example.com",
                "adminPassword123",
                true,
            );
            expect(res.json).toHaveBeenCalledWith({ token: mockToken });
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST when email is missing", async () => {
            req.body = {
                email: "",
                password: "password123",
            };

            await loginAdmin(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.BAD_REQUEST}: Missing required fields`,
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
            expect(Auth.prototype.login).not.toHaveBeenCalled();
        });

        it("should return BAD_REQUEST when password is missing", async () => {
            req.body = {
                email: "admin@example.com",
                password: "",
            };

            await loginAdmin(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });

        it("should return BAD_REQUEST when both fields are missing", async () => {
            req.body = {};

            await loginAdmin(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });

        it("should return UNAUTHORIZED when credentials are invalid", async () => {
            req.body = {
                email: "admin@example.com",
                password: "wrongPassword",
            };

            const error = new Error("Invalid credentials");
            (Auth.prototype.login as jest.Mock).mockRejectedValue(error);

            await loginAdmin(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`,
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid email or password",
            });
        });

        it("should return INTERNAL_SERVER_ERROR on database error", async () => {
            req.body = {
                email: "admin@example.com",
                password: "password123",
            };

            const error = new Error("Database connection failed");
            (Auth.prototype.login as jest.Mock).mockRejectedValue(error);

            await loginAdmin(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should return BAD_REQUEST when values are null", async () => {
            req.body = {
                email: null,
                password: null,
            };

            await loginAdmin(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });
    });

    describe("me", () => {
        it("should return admin user info successfully", async () => {
            const mockUser = {
                user_id: "admin123",
                email: "admin@example.com",
                first_name: "Admin",
                last_name: "User",
                role: "admin",
            };

            req.user = { user_id: "admin123" };

            const mockUserInfo = {
                user: mockUser,
            };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        getUserInfo: jest.fn().mockResolvedValue(mockUserInfo),
                    }) as never,
            );

            await me(req as Request, res as Response, next);

            expect(User).toHaveBeenCalledWith("admin123");
            expect(res.json).toHaveBeenCalledWith({ user: mockUser });
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return UNAUTHORIZED when user is not authenticated", async () => {
            req.user = undefined;

            await me(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
            expect(User).not.toHaveBeenCalled();
        });

        it("should return 404 when user is not found", async () => {
            req.user = { user_id: "nonexistent" };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        getUserInfo: jest.fn().mockResolvedValue(null),
                    }) as never,
            );

            await me(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found",
            });
        });

        it("should return 500 on internal error", async () => {
            req.user = { user_id: "admin123" };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        getUserInfo: jest
                            .fn()
                            .mockRejectedValue(new Error("DB error")),
                    }) as never,
            );

            await me(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should handle null user_id", async () => {
            req.user = { user_id: null } as never;

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        getUserInfo: jest.fn().mockResolvedValue({ user: {} }),
                    }) as never,
            );

            await me(req as Request, res as Response, next);

            expect(User).toHaveBeenCalledWith(null);
        });
    });

    describe("getUsers", () => {
        it("should return all users successfully", async () => {
            const mockUsers = [
                {
                    user_id: "1",
                    email: "user1@example.com",
                    first_name: "John",
                    last_name: "Doe",
                },
                {
                    user_id: "2",
                    email: "user2@example.com",
                    first_name: "Jane",
                    last_name: "Smith",
                },
            ];

            const mockFind = {
                select: jest.fn().mockResolvedValue(mockUsers),
            };

            (UserDB.find as jest.Mock).mockReturnValue(mockFind);

            await getUsers(req as Request, res as Response, next);

            expect(UserDB.find).toHaveBeenCalled();
            expect(mockFind.select).toHaveBeenCalledWith("-password -_id -__v");
            expect(res.json).toHaveBeenCalledWith({ users: mockUsers });
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return empty array when no users exist", async () => {
            const mockFind = {
                select: jest.fn().mockResolvedValue([]),
            };

            (UserDB.find as jest.Mock).mockReturnValue(mockFind);

            await getUsers(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({ users: [] });
        });

        it("should return INTERNAL_SERVER_ERROR on database error", async () => {
            const error = new Error("Database connection lost");

            const mockFind = {
                select: jest.fn().mockRejectedValue(error),
            };

            (UserDB.find as jest.Mock).mockReturnValue(mockFind);

            await getUsers(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should handle error in select chain", async () => {
            const error = new Error("Select operation failed");
            (UserDB.find as jest.Mock).mockImplementation(() => {
                throw error;
            });

            await getUsers(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.INTERNAL_SERVER_ERROR}: ${error}`,
            );
            expect(res.status).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
        });

        it("should handle large number of users", async () => {
            const mockUsers = Array.from({ length: 10000 }, (_, i) => ({
                user_id: `${i}`,
                email: `user${i}@example.com`,
            }));

            const mockFind = {
                select: jest.fn().mockResolvedValue(mockUsers),
            };

            (UserDB.find as jest.Mock).mockReturnValue(mockFind);

            await getUsers(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({ users: mockUsers });
            expect(mockUsers.length).toBe(10000);
        });
    });
});
