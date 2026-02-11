import User from "../../src/models/user/user";
import {
    UserDB,
    UserHealthAttributionsDB,
} from "../../src/database/models/user";
import Logger from "../../src/libs/logger";
import VaultService from "../../src/services/vault";

jest.mock("../../src/database/models/user");
jest.mock("../../src/libs/logger");
jest.mock("../../src/services/vault");

describe("User Model Tests", () => {
    let user: User;
    const mockUserId = "user-123";

    beforeEach(() => {
        user = new User(mockUserId);
        jest.clearAllMocks();

        // Default VaultService mocks
        (VaultService.encryptFields as jest.Mock).mockResolvedValue({});
        (VaultService.decryptFields as jest.Mock).mockResolvedValue({});
    });

    describe("Constructor", () => {
        it("should create instance with user_id", () => {
            const newUser = new User("test-id");
            expect(newUser.user_id).toBe("test-id");
        });
    });

    describe("getUserInfo", () => {
        it("should return user info successfully", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
                first_name: "John",
                last_name: "Doe",
                verified: true,
                role: ["user"],
                quiz_finished: true,
                chat_tokens: 1000,
                chat_tokens_refreshed_at: "2025-01-01",
                avatar: "avatar.jpg",
            };

            const mockHealth = {
                user_id: mockUserId,
                weight: 70,
                height: 175,
                birth_date: "1995-01-01T00:00:00.000Z",
                created_at: new Date("2025-01-01"),
                toObject: jest.fn().mockReturnValue({
                    weight: 70,
                    height: 175,
                    birth_date: "1995-01-01T00:00:00.000Z",
                }),
            };

            const mockDecryptedHealth = {
                weight: 70,
                height: 175,
                birth_date: "1995-01-01T00:00:00.000Z",
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(mockHealth);
            (VaultService.decryptFields as jest.Mock).mockResolvedValue(
                mockDecryptedHealth,
            );

            const result = await user.getUserInfo();

            expect(result).toEqual({
                user: {
                    user_id: mockUserId,
                    email: "test@example.com",
                    first_name: "John",
                    last_name: "Doe",
                    verified: true,
                    role: ["user"],
                    quiz_finished: true,
                    chat_tokens: 1000,
                    chat_tokens_refreshed_at: "2025-01-01",
                    avatar: "avatar.jpg",
                    health: {
                        weight: 70,
                        height: 175,
                        birth_date: "1995-01-01T00:00:00.000Z",
                        user_id: mockUserId,
                        created_at: mockHealth.created_at,
                    },
                },
            });
        });

        it("should return user info with empty health when no health data", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
                first_name: "John",
                last_name: "Doe",
                verified: false,
                role: ["user"],
                quiz_finished: false,
                chat_tokens: 500,
                chat_tokens_refreshed_at: null,
                avatar: null,
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(null);

            const result = await user.getUserInfo();

            expect(result.user.health).toEqual({});
            expect(result.user.email).toBe("test@example.com");
        });

        it("should throw AN_ERROR_OCCURRED when user_id is empty", async () => {
            const emptyUser = new User("");

            await expect(emptyUser.getUserInfo()).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
        });

        it("should throw AN_ERROR_OCCURRED when user not found", async () => {
            UserDB.findOne = jest.fn().mockResolvedValue(null);

            await expect(user.getUserInfo()).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            expect(Logger.error).toHaveBeenCalledWith("User not found");
        });

        it("should return user info with empty health when userHealthInfo is null", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
                first_name: "Jane",
                last_name: "Smith",
                verified: false,
                role: ["user"],
                quiz_finished: false,
                chat_tokens: 100,
                chat_tokens_refreshed_at: null,
                avatar: null,
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(null);

            const result = await user.getUserInfo();

            expect(result.user.health).toEqual({});
            expect(result.user.email).toBe("test@example.com");
        });

        it("should throw AN_ERROR_OCCURRED when database query fails", async () => {
            UserDB.findOne = jest.fn().mockRejectedValue(new Error("DB error"));

            await expect(user.getUserInfo()).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
        });

        it("should throw AN_ERROR_OCCURRED when health query fails", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
                first_name: "John",
                last_name: "Doe",
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockRejectedValue(new Error("Health DB error"));

            await expect(user.getUserInfo()).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
        });
    });

    describe("healthQuiz", () => {
        const mockHealthData = {
            first_name: "John",
            last_name: "Doe",
            weight: 70,
            height: 175,
            birth_date: new Date("1995-01-01T00:00:00.000Z"),
            gender: "male" as const,
        };

        it("should complete health quiz successfully", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
            };

            const mockEncryptedData = {
                weight: "vault:v1:encrypted_weight",
                height: "vault:v1:encrypted_height",
                birth_date: "vault:v1:encrypted_birth_date",
                gender: "vault:v1:encrypted_gender",
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(null);
            UserDB.updateOne = jest.fn().mockResolvedValue({
                acknowledged: true,
                modifiedCount: 1,
                matchedCount: 1,
            });
            UserHealthAttributionsDB.create = jest.fn().mockResolvedValue({
                user_id: mockUserId,
                weight: 70,
            });
            (VaultService.encryptFields as jest.Mock).mockResolvedValue(
                mockEncryptedData,
            );

            await user.healthQuiz(mockHealthData);

            expect(UserDB.findOne).toHaveBeenCalled();
            expect(UserHealthAttributionsDB.findOne).toHaveBeenCalled();
            expect(UserDB.updateOne).toHaveBeenCalled();
            expect(UserHealthAttributionsDB.create).toHaveBeenCalled();
            expect(VaultService.encryptFields).toHaveBeenCalled();
        });

        it("should throw USER_ID_REQUIRED when user_id is empty", async () => {
            const emptyUser = new User("");

            await expect(emptyUser.healthQuiz(mockHealthData)).rejects.toThrow(
                "USER_ID_REQUIRED",
            );
        });

        it("should throw MISSING_HEALTH_DATA when health data is null", async () => {
            await expect(user.healthQuiz(null as never)).rejects.toThrow(
                "MISSING_HEALTH_DATA",
            );
        });

        it("should throw MISSING_HEALTH_DATA when health data is undefined", async () => {
            await expect(user.healthQuiz(undefined as never)).rejects.toThrow(
                "MISSING_HEALTH_DATA",
            );
        });

        it("should throw AN_ERROR_OCCURRED when user not found", async () => {
            UserDB.findOne = jest.fn().mockResolvedValue(null);

            await expect(user.healthQuiz(mockHealthData)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            expect(Logger.error).toHaveBeenCalledWith(
                "USER_NOT_FOUND_FOR_HEALTH_QUIZ",
            );
        });

        it("should throw AN_ERROR_OCCURRED when quiz already completed", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
            };

            const existingHealth = {
                user_id: mockUserId,
                weight: 65,
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(existingHealth);

            await expect(user.healthQuiz(mockHealthData)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            expect(Logger.error).toHaveBeenCalledWith(
                "USER_ALREADY_COMPLETED_QUIZ",
            );
        });

        it("should throw AN_ERROR_OCCURRED when database query fails", async () => {
            UserDB.findOne = jest.fn().mockRejectedValue(new Error("DB error"));

            await expect(user.healthQuiz(mockHealthData)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should throw AN_ERROR_OCCURRED when updateOne fails", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(null);
            UserDB.updateOne = jest
                .fn()
                .mockRejectedValue(new Error("Update failed"));

            await expect(user.healthQuiz(mockHealthData)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should throw AN_ERROR_OCCURRED when create fails", async () => {
            const mockUser = {
                user_id: mockUserId,
                email: "test@example.com",
            };

            UserDB.findOne = jest.fn().mockResolvedValue(mockUser);
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(null);
            UserDB.updateOne = jest
                .fn()
                .mockResolvedValue({ modifiedCount: 1 });
            UserHealthAttributionsDB.create = jest
                .fn()
                .mockRejectedValue(new Error("Create failed"));

            await expect(user.healthQuiz(mockHealthData)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            expect(Logger.error).toHaveBeenCalled();
        });
    });
});
