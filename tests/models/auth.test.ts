import { Auth } from "../../src/models/auth";
import { UserDB } from "@database/models/user";
import Logger from "@libs/logger";
import { generateToken } from "@utils/jwt";
import bcrypt from "bcryptjs";

jest.mock("@database/models/user");
jest.mock("@libs/logger");
jest.mock("@utils/jwt");
jest.mock("bcryptjs");
jest.mock("crypto", () => ({
    randomUUID: jest.fn(),
}));
jest.mock("mongoose", () => ({
    Schema: jest.fn(),
    model: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        save: jest.fn(),
    }),
    connect: jest.fn(),
}));

describe("Auth Tests", () => {
    let auth: Auth;

    beforeEach(() => {
        auth = new Auth();
        jest.clearAllMocks();
    });

    describe("createNewUser", () => {
        it("should throw an error if email or password is missing", async () => {
            await expect(auth.createNewUser("", "password")).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            await expect(
                auth.createNewUser("test@example.com", ""),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw an error if user already exists", async () => {
            (UserDB.findOne as jest.Mock).mockResolvedValue({
                email: "test@example.com",
            });
            await expect(
                auth.createNewUser("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        // TODO: Fix this test and create a DB mock to ensure the user is saved in Test DB
        // it("should create a new user and return a token", async () => {
        //     (UserDB.findOne as jest.Mock).mockResolvedValue(null);
        //     (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
        //     (randomUUID as jest.Mock).mockReturnValue("mock-uuid");
        //     (generateToken as jest.Mock).mockReturnValue("mock-token");
        //
        //     const result = await auth.createNewUser(
        //         "hopti@example.com",
        //         "password",
        //     );
        //     expect(result).toEqual({ token: "mock-token" });
        //     expect(UserDB).toHaveBeenCalledWith({
        //         user_id: "mock-uuid",
        //         email: "test@example.com",
        //         password: "hashedPassword",
        //         created_at: expect.any(String),
        //     });
        //     expect(Logger.info).toHaveBeenCalledWith(
        //         "User created: test@example.com",
        //     );
        // });

        it("should throw an error if there is an error creating the user", async () => {
            (UserDB.findOne as jest.Mock).mockRejectedValue(
                new Error("Database error"),
            );
            await expect(
                auth.createNewUser("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
            expect(Logger.error).toHaveBeenCalledWith(
                "500: Internal server error",
            );
        });
    });

    describe("login", () => {
        it("should throw an error if email or password is missing", async () => {
            await expect(auth.login("", "password")).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            await expect(auth.login("test@example.com", "")).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
        });

        it("should throw an error if user does not exist", async () => {
            (UserDB.findOne as jest.Mock).mockResolvedValue(null);
            await expect(
                auth.login("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw an error if password does not match", async () => {
            (UserDB.findOne as jest.Mock).mockResolvedValue({
                password: "hashedPassword",
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            await expect(
                auth.login("test@example.com", "wrongpassword"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should return a token if login is successful", async () => {
            const mockUser = {
                user_id: "mock-uuid",
                email: "test@example.com",
                password: "hashedPassword",
            };
            (UserDB.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (generateToken as jest.Mock).mockReturnValue("mock-token");

            const result = await auth.login("test@example.com", "password");
            expect(result).toEqual({ token: "mock-token" });
        });

        it("should throw an error if there is an error logging in", async () => {
            (UserDB.findOne as jest.Mock).mockRejectedValue(
                new Error("Database error"),
            );
            await expect(
                auth.login("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });
    });
});
