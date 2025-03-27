import { createNewUser, login } from "../../src/controllers/auth";
import { Auth } from "../../src/models/auth";
import Logger from "../../src/libs/logger";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

jest.mock("../../src/models/auth");
jest.mock("../../src/libs/logger");

describe("User Authentication Tests", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let status: jest.Mock;
    let json: jest.Mock;

    beforeEach(() => {
        req = { body: {} };
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
        it("should return BAD_REQUEST if required fields are missing", async () => {
            req.body = {
                first_name: "John",
                last_name: "Doe",
                email: "",
                password: "",
            };
            await createNewUser(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });

        it("should return CREATED and token if user is created successfully", async () => {
            req.body = {
                first_name: "John",
                last_name: "Doe",
                email: "john.doe@example.com",
                password: "password",
            };
            (Auth.prototype.createNewUser as jest.Mock).mockResolvedValue({
                token: "mock-token",
            });
            await createNewUser(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
            expect(res.json).toHaveBeenCalledWith({ token: "mock-token" });
        });

        it("should return INTERNAL_SERVER_ERROR if there is an error creating the user", async () => {
            req.body = {
                first_name: "Ilan",
                last_name: "Hopti",
                email: "hopti@example.com",
                password: "password",
            };
            (Auth.prototype.createNewUser as jest.Mock).mockRejectedValue(
                new Error("Database error"),
            );
            await createNewUser(req as Request, res as Response, next);
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
    });

    describe("login", () => {
        it("should return BAD_REQUEST if required fields are missing", async () => {
            req.body = { email: "", password: "" };
            await login(req as Request, res as Response, next);
            expect(Logger.error).toHaveBeenCalledWith(
                `${StatusCodes.BAD_REQUEST}: Missing required fields`,
            );
            expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });

        it("should return token if login is successful", async () => {
            req.body = { email: "john.doe@example.com", password: "password" };
            (Auth.prototype.login as jest.Mock).mockResolvedValue({
                token: "mock-token",
            });
            await login(req as Request, res as Response, next);
            expect(res.json).toHaveBeenCalledWith({ token: "mock-token" });
        });

        it("should return UNAUTHORIZED if credentials are invalid", async () => {
            req.body = {
                email: "john.doe@example.com",
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

        it("should return INTERNAL_SERVER_ERROR if there is an error logging in", async () => {
            req.body = { email: "john.doe@example.com", password: "password" };
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
    });
});
