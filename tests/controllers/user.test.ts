import { getUserInfo, healthQuiz } from "../../src/controllers/user";
import User from "../../src/models/user/user";
import { Request, Response, NextFunction } from "express";

jest.mock("../../src/models/user/user");

describe("User Controller Tests", () => {
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

    describe("getUserInfo", () => {
        it("should return user info successfully when user is authenticated", async () => {
            const mockUser = {
                user_id: "123",
                email: "test@example.com",
                first_name: "John",
                last_name: "Doe",
            };

            req.user = { user_id: "123" };

            const mockUserInfo = {
                user: mockUser,
            };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        getUserInfo: jest.fn().mockResolvedValue(mockUserInfo),
                    }) as never,
            );

            await getUserInfo(req as Request, res as Response, next);

            expect(User).toHaveBeenCalledWith("123");
            expect(res.json).toHaveBeenCalledWith({ user: mockUser });
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return 403 when user is not authenticated", async () => {
            req.user = undefined;

            await getUserInfo(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
            expect(User).not.toHaveBeenCalled();
        });

        it("should return 400 when user_id is missing", async () => {
            req.user = {} as never;

            await getUserInfo(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "MISSING_USER_ID",
            });
            expect(User).not.toHaveBeenCalled();
        });

        it("should return 404 when user is not found in database", async () => {
            req.user = { user_id: "999" };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        getUserInfo: jest.fn().mockResolvedValue(null),
                    }) as never,
            );

            await getUserInfo(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found",
            });
        });

        it("should return 500 when database operation fails", async () => {
            req.user = { user_id: "123" };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        getUserInfo: jest
                            .fn()
                            .mockRejectedValue(
                                new Error("Database connection error"),
                            ),
                    }) as never,
            );

            await getUserInfo(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should return 400 when user_id is null", async () => {
            req.user = { user_id: null } as never;

            await getUserInfo(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "MISSING_USER_ID",
            });
        });

        it("should return 400 when user_id is empty string", async () => {
            req.user = { user_id: "" };

            await getUserInfo(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "MISSING_USER_ID",
            });
        });
    });

    describe("healthQuiz", () => {
        it("should complete health quiz successfully", async () => {
            const mockHealthData = {
                weight: 70,
                height: 175,
                birth_date: "1995-01-01T00:00:00.000Z",
                gender: "male",
            };

            req.user = { user_id: "123" };
            req.body = mockHealthData;

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        healthQuiz: jest.fn().mockResolvedValue(undefined),
                    }) as never,
            );

            await healthQuiz(req as Request, res as Response, next);

            expect(User).toHaveBeenCalledWith("123");
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should return 403 when user is not authenticated", async () => {
            req.user = undefined;
            req.body = { weight: 70 };

            await healthQuiz(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
            expect(User).not.toHaveBeenCalled();
        });

        it("should return 400 when health data is missing", async () => {
            req.user = { user_id: "123" };
            req.body = undefined;

            await healthQuiz(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "MISSING_HEALTH_DATA",
            });
            expect(User).not.toHaveBeenCalled();
        });

        it("should return 500 when saving health quiz fails", async () => {
            req.user = { user_id: "123" };
            req.body = { weight: 70, height: 175 };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        healthQuiz: jest
                            .fn()
                            .mockRejectedValue(new Error("Database error")),
                    }) as never,
            );

            await healthQuiz(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error",
            });
        });

        it("should handle user without user_id in healthQuiz", async () => {
            req.user = {} as never;
            req.body = { weight: 70 };

            (User as jest.MockedClass<typeof User>).mockImplementation(
                () =>
                    ({
                        healthQuiz: jest.fn().mockResolvedValue(undefined),
                    }) as never,
            );

            await healthQuiz(req as Request, res as Response, next);

            expect(User).toHaveBeenCalledWith(undefined);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should handle health data with null values", async () => {
            req.user = { user_id: "123" };
            req.body = null;

            await healthQuiz(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "MISSING_HEALTH_DATA",
            });
        });
    });
});
