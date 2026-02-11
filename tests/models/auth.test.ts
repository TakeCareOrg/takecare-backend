import { Auth } from "../../src/models/auth";
import { UserDB } from "../../src/database/models/user";
import { VerificationCodeDB } from "../../src/database/models/verificationCodes";
import Logger from "../../src/libs/logger";
import { generateToken } from "../../src/utils/jwt";
import bcrypt from "bcryptjs";

jest.mock("../../src/database/models/user");
jest.mock("../../src/database/models/verificationCodes");
jest.mock("../../src/libs/logger");
jest.mock("../../src/services/mail/templates/email-verification");
jest.mock("../../src/utils/jwt");
jest.mock("bcryptjs");
jest.mock("crypto");

describe("Auth Model Tests", () => {
    let auth: Auth;

    beforeEach(() => {
        auth = new Auth();
        jest.clearAllMocks();
    });

    describe("login", () => {
        it("should login successfully and return a token", async () => {
            const mockUser = {
                user_id: "user-123",
                email: "test@example.com",
                password: "hashed-password",
                role: ["user"],
            };

            (UserDB.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (generateToken as jest.Mock).mockReturnValue("jwt-token");

            const result = await auth.login("test@example.com", "password123");

            expect(UserDB.findOne).toHaveBeenCalledWith({
                email: "test@example.com",
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(
                "password123",
                "hashed-password",
            );
            expect(generateToken).toHaveBeenCalledWith({ user_id: "user-123" });
            expect(result).toEqual({ token: "jwt-token" });
        });

        it("should login admin successfully", async () => {
            const mockUser = {
                user_id: "admin-123",
                email: "admin@example.com",
                password: "hashed-password",
                role: ["user", "admin"],
            };

            (UserDB.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (generateToken as jest.Mock).mockReturnValue("admin-token");

            const result = await auth.login(
                "admin@example.com",
                "password",
                true,
            );

            expect(result).toEqual({ token: "admin-token" });
        });

        it("should throw MISSING_FIELDS when email is missing", async () => {
            await expect(auth.login("", "password")).rejects.toThrow(
                "MISSING_FIELDS",
            );
            expect(UserDB.findOne).not.toHaveBeenCalled();
        });

        it("should throw MISSING_FIELDS when password is missing", async () => {
            await expect(auth.login("test@example.com", "")).rejects.toThrow(
                "MISSING_FIELDS",
            );
            expect(UserDB.findOne).not.toHaveBeenCalled();
        });

        it("should throw MISSING_FIELDS when both fields are missing", async () => {
            await expect(auth.login("", "")).rejects.toThrow("MISSING_FIELDS");
        });

        it("should throw AN_ERROR_OCCURRED when user does not exist", async () => {
            (UserDB.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                auth.login("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when password is incorrect", async () => {
            const mockUser = {
                user_id: "user-123",
                email: "test@example.com",
                password: "hashed-password",
            };

            (UserDB.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                auth.login("test@example.com", "wrongpassword"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when non-admin tries admin login", async () => {
            const mockUser = {
                user_id: "user-123",
                email: "user@example.com",
                password: "hashed-password",
                role: ["user"],
            };

            (UserDB.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await expect(
                auth.login("user@example.com", "password", true),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when user has no role and tries admin login", async () => {
            const mockUser = {
                user_id: "user-123",
                email: "user@example.com",
                password: "hashed-password",
                role: undefined,
            };

            (UserDB.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await expect(
                auth.login("user@example.com", "password", true),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when database query fails", async () => {
            (UserDB.findOne as jest.Mock).mockRejectedValue(
                new Error("Database error"),
            );

            await expect(
                auth.login("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when bcrypt.compare fails", async () => {
            const mockUser = {
                user_id: "user-123",
                email: "test@example.com",
                password: "hashed-password",
            };

            (UserDB.findOne as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockRejectedValue(
                new Error("Bcrypt error"),
            );

            await expect(
                auth.login("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });
    });

    describe("verifyEmail", () => {
        it("should verify email successfully", async () => {
            const mockVerificationCode = {
                user_id: "user-123",
                code: 123456,
                deleteOne: jest.fn().mockResolvedValue(true),
            };

            (VerificationCodeDB.findOne as jest.Mock).mockResolvedValue(
                mockVerificationCode,
            );
            (UserDB.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 1,
            });

            const result = await auth.verifyEmail("user-123", "123456");

            expect(VerificationCodeDB.findOne).toHaveBeenCalledWith({
                user_id: "user-123",
                code: 123456,
            });
            expect(UserDB.updateOne).toHaveBeenCalledWith(
                { user_id: "user-123" },
                { verified: true },
            );
            expect(mockVerificationCode.deleteOne).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it("should return false when verification code not found", async () => {
            (VerificationCodeDB.findOne as jest.Mock).mockResolvedValue(null);

            const result = await auth.verifyEmail("user-123", "999999");

            expect(result).toBe(false);
            expect(UserDB.updateOne).not.toHaveBeenCalled();
        });

        it("should throw MISSING_FIELDS when user_id is missing", async () => {
            await expect(auth.verifyEmail("", "123456")).rejects.toThrow(
                "MISSING_FIELDS",
            );
            expect(VerificationCodeDB.findOne).not.toHaveBeenCalled();
        });

        it("should throw MISSING_FIELDS when code is missing", async () => {
            await expect(auth.verifyEmail("user-123", "")).rejects.toThrow(
                "MISSING_FIELDS",
            );
            expect(VerificationCodeDB.findOne).not.toHaveBeenCalled();
        });

        it("should throw MISSING_FIELDS when both fields are missing", async () => {
            await expect(auth.verifyEmail("", "")).rejects.toThrow(
                "MISSING_FIELDS",
            );
        });

        it("should throw AN_ERROR_OCCURRED when no user matched", async () => {
            const mockVerificationCode = {
                user_id: "user-123",
                code: 123456,
                deleteOne: jest.fn().mockResolvedValue(true),
            };

            (VerificationCodeDB.findOne as jest.Mock).mockResolvedValue(
                mockVerificationCode,
            );
            (UserDB.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 0,
                modifiedCount: 0,
            });

            await expect(
                auth.verifyEmail("user-123", "123456"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when user matched but not modified", async () => {
            const mockVerificationCode = {
                user_id: "user-123",
                code: 123456,
                deleteOne: jest.fn().mockResolvedValue(true),
            };

            (VerificationCodeDB.findOne as jest.Mock).mockResolvedValue(
                mockVerificationCode,
            );
            (UserDB.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 0,
            });

            await expect(
                auth.verifyEmail("user-123", "123456"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when deleteOne fails", async () => {
            const mockVerificationCode = {
                user_id: "user-123",
                code: 123456,
                deleteOne: jest
                    .fn()
                    .mockRejectedValue(new Error("Delete failed")),
            };

            (VerificationCodeDB.findOne as jest.Mock).mockResolvedValue(
                mockVerificationCode,
            );
            (UserDB.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 1,
            });

            await expect(
                auth.verifyEmail("user-123", "123456"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when database query fails", async () => {
            (VerificationCodeDB.findOne as jest.Mock).mockRejectedValue(
                new Error("Database error"),
            );

            await expect(
                auth.verifyEmail("user-123", "123456"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should handle numeric code conversion", async () => {
            const mockVerificationCode = {
                user_id: "user-123",
                code: 123456,
                deleteOne: jest.fn().mockResolvedValue(true),
            };

            (VerificationCodeDB.findOne as jest.Mock).mockResolvedValue(
                mockVerificationCode,
            );
            (UserDB.updateOne as jest.Mock).mockResolvedValue({
                matchedCount: 1,
                modifiedCount: 1,
            });

            await auth.verifyEmail("user-123", "123456");

            expect(VerificationCodeDB.findOne).toHaveBeenCalledWith({
                user_id: "user-123",
                code: 123456,
            });
        });
    });

    describe("createNewUser", () => {
        it("should throw MISSING_FIELDS when email is missing", async () => {
            await expect(auth.createNewUser("", "password")).rejects.toThrow(
                "MISSING_FIELDS",
            );
        });

        it("should throw MISSING_FIELDS when password is missing", async () => {
            await expect(
                auth.createNewUser("test@example.com", ""),
            ).rejects.toThrow("MISSING_FIELDS");
        });

        it("should throw MISSING_FIELDS when both fields are missing", async () => {
            await expect(auth.createNewUser("", "")).rejects.toThrow(
                "MISSING_FIELDS",
            );
        });

        it("should throw AN_ERROR_OCCURRED when user already exists", async () => {
            (UserDB.findOne as jest.Mock).mockResolvedValue({
                email: "existing@example.com",
                user_id: "existing-id",
            });

            await expect(
                auth.createNewUser("existing@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should throw AN_ERROR_OCCURRED when isUniqueUser fails", async () => {
            (UserDB.findOne as jest.Mock).mockRejectedValue(
                new Error("Database error"),
            );

            await expect(
                auth.createNewUser("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should throw AN_ERROR_OCCURRED when bcrypt.hash fails", async () => {
            (UserDB.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockRejectedValue(
                new Error("Hash error"),
            );

            await expect(
                auth.createNewUser("test@example.com", "password"),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
            expect(Logger.error).toHaveBeenCalled();
        });
    });
});
