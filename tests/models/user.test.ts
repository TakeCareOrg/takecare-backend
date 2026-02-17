import User from "../../src/models/user/user";
import {
    UserDB,
    UserHealthAttributionsDB,
    UserUpdatesDB,
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

    describe("updateHealthData", () => {
        const validHealthData = {
            weight: 75,
            height: 180,
            gender: "male" as const,
        };

        it("should update health data successfully", async () => {
            const mockUpdatedHealth = { user_id: mockUserId, weight: 75 };
            const mockEncryptedData = { weight: "vault:v1:encrypted_weight" };

            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue({ user_id: mockUserId });
            UserHealthAttributionsDB.findOneAndUpdate = jest
                .fn()
                .mockResolvedValue(mockUpdatedHealth);
            UserUpdatesDB.create = jest.fn().mockResolvedValue({});
            (VaultService.encryptFields as jest.Mock).mockResolvedValue(
                mockEncryptedData,
            );

            const result = await user.updateHealthData(validHealthData);

            expect(UserHealthAttributionsDB.findOne).toHaveBeenCalledWith({
                user_id: mockUserId,
            });
            expect(VaultService.encryptFields).toHaveBeenCalled();
            expect(
                UserHealthAttributionsDB.findOneAndUpdate,
            ).toHaveBeenCalled();
            expect(UserUpdatesDB.create).toHaveBeenCalled();
            expect(result).toMatchObject({ weight: 75, height: 180 });
        });

        it("should throw USER_ID_REQUIRED when user_id is empty", async () => {
            const emptyUser = new User("");

            await expect(
                emptyUser.updateHealthData(validHealthData),
            ).rejects.toThrow("USER_ID_REQUIRED");
        });

        it("should throw MISSING_HEALTH_DATA when data is empty object", async () => {
            await expect(user.updateHealthData({})).rejects.toThrow(
                "MISSING_HEALTH_DATA",
            );
        });

        it("should throw MISSING_HEALTH_DATA when data is null", async () => {
            await expect(user.updateHealthData(null as never)).rejects.toThrow(
                "MISSING_HEALTH_DATA",
            );
        });

        it("should throw when zod validation fails", async () => {
            await expect(
                user.updateHealthData({ weight: "not-a-number" } as never),
            ).rejects.toThrow();
        });

        it("should throw AN_ERROR_OCCURRED when health data not found", async () => {
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(null);

            await expect(
                user.updateHealthData(validHealthData),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when findOneAndUpdate returns null", async () => {
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue({ user_id: mockUserId });
            UserHealthAttributionsDB.findOneAndUpdate = jest
                .fn()
                .mockResolvedValue(null);
            UserUpdatesDB.create = jest.fn().mockResolvedValue({});

            await expect(
                user.updateHealthData(validHealthData),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw AN_ERROR_OCCURRED when database query fails", async () => {
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockRejectedValue(new Error("DB error"));

            await expect(
                user.updateHealthData(validHealthData),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe("updateUserInfo", () => {
        const validUserInfo = {
            first_name: "Jane",
            last_name: "Smith",
        };

        it("should update user info successfully", async () => {
            UserDB.findOne = jest
                .fn()
                .mockResolvedValue({ user_id: mockUserId });
            UserDB.updateOne = jest
                .fn()
                .mockResolvedValue({ modifiedCount: 1 });
            UserUpdatesDB.create = jest.fn().mockResolvedValue({});

            const result = await user.updateUserInfo(validUserInfo);

            expect(UserDB.findOne).toHaveBeenCalledWith({
                user_id: mockUserId,
            });
            expect(UserDB.updateOne).toHaveBeenCalled();
            expect(UserUpdatesDB.create).toHaveBeenCalled();
            expect(result).toEqual(validUserInfo);
        });

        it("should update only avatar successfully", async () => {
            const avatarData = { avatar: "https://example.com/avatar.jpg" };

            UserDB.findOne = jest
                .fn()
                .mockResolvedValue({ user_id: mockUserId });
            UserDB.updateOne = jest
                .fn()
                .mockResolvedValue({ modifiedCount: 1 });
            UserUpdatesDB.create = jest.fn().mockResolvedValue({});

            const result = await user.updateUserInfo(avatarData);

            expect(result).toEqual(avatarData);
        });

        it("should throw USER_ID_REQUIRED when user_id is empty", async () => {
            const emptyUser = new User("");

            await expect(
                emptyUser.updateUserInfo(validUserInfo),
            ).rejects.toThrow("USER_ID_REQUIRED");
        });

        it("should throw when zod validation fails on unknown key", async () => {
            await expect(
                user.updateUserInfo({ unknown_field: "x" } as never),
            ).rejects.toThrow();
        });

        it("should throw when first_name is empty string", async () => {
            await expect(
                user.updateUserInfo({ first_name: "" }),
            ).rejects.toThrow();
        });

        it("should throw when first_name exceeds 50 characters", async () => {
            await expect(
                user.updateUserInfo({ first_name: "a".repeat(51) }),
            ).rejects.toThrow();
        });

        it("should throw when avatar is not a valid URL", async () => {
            await expect(
                user.updateUserInfo({ avatar: "not-a-url" }),
            ).rejects.toThrow();
        });

        it("should throw AN_ERROR_OCCURRED when user not found", async () => {
            UserDB.findOne = jest.fn().mockResolvedValue(null);

            await expect(user.updateUserInfo(validUserInfo)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
        });

        it("should throw AN_ERROR_OCCURRED when database query fails", async () => {
            UserDB.findOne = jest.fn().mockRejectedValue(new Error("DB error"));

            await expect(user.updateUserInfo(validUserInfo)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe("updateUser", () => {
        const validCompleteUser = {
            user_id: mockUserId,
            email: "test@example.com",
            password: "hashed_password",
            created_at: new Date("2024-01-01"),
            verified: true,
            role: "user" as const,
            first_name: "John",
            last_name: "Doe",
            chat_tokens: 1000,
            health: {
                user_id: mockUserId,
                created_at: new Date("2024-01-01"),
                weight: 70,
            },
        };

        it("should update complete user successfully", async () => {
            UserDB.updateOne = jest
                .fn()
                .mockResolvedValue({ modifiedCount: 1 });
            UserHealthAttributionsDB.updateOne = jest
                .fn()
                .mockResolvedValue({ modifiedCount: 1 });

            const result = await user.updateUser(validCompleteUser as never);

            expect(UserDB.updateOne).toHaveBeenCalledWith(
                { user_id: mockUserId },
                expect.any(Object),
            );
            expect(UserHealthAttributionsDB.updateOne).toHaveBeenCalled();
            expect(result).toEqual({ user: expect.anything() });
        });

        it("should throw AN_ERROR_OCCURRED when user is null", async () => {
            await expect(user.updateUser(null as never)).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
        });

        it("should throw AN_ERROR_OCCURRED when user_id is empty", async () => {
            const emptyUser = new User("");

            await expect(
                emptyUser.updateUser(validCompleteUser as never),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });

        it("should throw when zod validation fails on invalid email", async () => {
            const invalidUser = { ...validCompleteUser, email: "not-an-email" };

            await expect(
                user.updateUser(invalidUser as never),
            ).rejects.toThrow();
            expect(Logger.error).toHaveBeenCalledWith(
                "User validation failed",
                expect.anything(),
            );
        });

        it("should throw AN_ERROR_OCCURRED when database query fails", async () => {
            UserDB.updateOne = jest
                .fn()
                .mockRejectedValue(new Error("DB error"));
            UserHealthAttributionsDB.updateOne = jest
                .fn()
                .mockResolvedValue({ modifiedCount: 1 });

            await expect(
                user.updateUser(validCompleteUser as never),
            ).rejects.toThrow("AN_ERROR_OCCURRED");
        });
    });

    describe("getHealthData", () => {
        it("should return decrypted health data successfully", async () => {
            const mockCreatedAt = new Date("2024-01-01");
            const mockHealthInfo = {
                created_at: mockCreatedAt,
                toObject: jest.fn().mockReturnValue({
                    weight: "vault:v1:encrypted_weight",
                    height: "vault:v1:encrypted_height",
                }),
            };
            const mockDecrypted = { weight: 70, height: 175 };

            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(mockHealthInfo);
            (VaultService.decryptFields as jest.Mock).mockResolvedValue(
                mockDecrypted,
            );

            const result = await user.getHealthData();

            expect(UserHealthAttributionsDB.findOne).toHaveBeenCalledWith({
                user_id: mockUserId,
            });
            expect(VaultService.decryptFields).toHaveBeenCalled();
            expect(result).toEqual({
                ...mockDecrypted,
                user_id: mockUserId,
                created_at: mockCreatedAt,
            });
        });

        it("should return undefined when no health data exists", async () => {
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(null);

            const result = await user.getHealthData();

            expect(result).toBeUndefined();
        });

        it("should throw AN_ERROR_OCCURRED when user_id is empty", async () => {
            const emptyUser = new User("");

            await expect(emptyUser.getHealthData()).rejects.toThrow(
                "AN_ERROR_OCCURRED",
            );
        });

        it("should log error and return undefined when decryption fails", async () => {
            const mockHealthInfo = {
                created_at: new Date(),
                toObject: jest.fn().mockReturnValue({ weight: "encrypted" }),
            };

            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockResolvedValue(mockHealthInfo);
            (VaultService.decryptFields as jest.Mock).mockRejectedValue(
                new Error("Decryption failed"),
            );

            const result = await user.getHealthData();

            expect(Logger.error).toHaveBeenCalledWith(
                `Failed to decrypt health data for user ${mockUserId}`,
                expect.any(Error),
            );
            expect(result).toBeUndefined();
        });

        it("should throw when database query fails", async () => {
            UserHealthAttributionsDB.findOne = jest
                .fn()
                .mockRejectedValue(new Error("DB error"));

            await expect(user.getHealthData()).rejects.toThrow();
        });
    });
});
