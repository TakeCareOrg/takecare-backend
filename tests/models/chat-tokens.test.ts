import UserChatTokens from "../../src/models/user/chat-tokens";
import { UserDB } from "../../src/database/models/user";
import Logger from "../../src/libs/logger";

jest.mock("../../src/database/models/user");
jest.mock("../../src/libs/logger");

describe("UserChatTokens Model Tests", () => {
    let chatTokens: UserChatTokens;
    const mockUserId = "user-123";

    beforeEach(() => {
        chatTokens = new UserChatTokens(mockUserId);
        jest.clearAllMocks();
    });

    describe("Constructor", () => {
        it("should create instance with user_id", () => {
            const instance = new UserChatTokens("test-id");
            expect(instance.user_id).toBe("test-id");
        });
    });

    describe("decreaseTokens", () => {
        it("should decrease tokens successfully and return new count", async () => {
            const mockUser = {
                user_id: mockUserId,
                chat_tokens: 99,
                email: "test@example.com",
            };

            const mockFindOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            });

            UserDB.findOneAndUpdate = mockFindOneAndUpdate;

            const result = await chatTokens.decreaseTokens();

            expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
                { user_id: mockUserId },
                {
                    $inc: { chat_tokens: -1 },
                    chat_tokens_refreshed_at: expect.any(Date),
                },
                { new: true },
            );
            expect(result).toBe(99);
        });

        it("should throw UNAUTHORIZED when user_id is empty", async () => {
            const emptyTokens = new UserChatTokens("");

            await expect(emptyTokens.decreaseTokens()).rejects.toThrow(
                "UNAUTHORIZED",
            );
        });

        it("should throw UNAUTHORIZED when user_id is null", async () => {
            const nullTokens = new UserChatTokens(null as never);

            await expect(nullTokens.decreaseTokens()).rejects.toThrow(
                "UNAUTHORIZED",
            );
        });

        it("should throw USER_NOT_FOUND when user does not exist", async () => {
            const mockFindOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            UserDB.findOneAndUpdate = mockFindOneAndUpdate;

            await expect(chatTokens.decreaseTokens()).rejects.toThrow(
                "INTERNAL_SERVER_ERROR",
            );
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should throw INTERNAL_SERVER_ERROR when database query fails", async () => {
            const mockFindOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockRejectedValue(new Error("DB error")),
            });

            UserDB.findOneAndUpdate = mockFindOneAndUpdate;

            await expect(chatTokens.decreaseTokens()).rejects.toThrow(
                "INTERNAL_SERVER_ERROR",
            );
            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining("Error decreasing chat tokens"),
            );
        });

        it("should handle zero tokens", async () => {
            const mockUser = {
                user_id: mockUserId,
                chat_tokens: 0,
            };

            const mockFindOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            });

            UserDB.findOneAndUpdate = mockFindOneAndUpdate;

            const result = await chatTokens.decreaseTokens();

            expect(result).toBe(0);
        });

        it("should handle negative tokens", async () => {
            const mockUser = {
                user_id: mockUserId,
                chat_tokens: -1,
            };

            const mockFindOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            });

            UserDB.findOneAndUpdate = mockFindOneAndUpdate;

            const result = await chatTokens.decreaseTokens();

            expect(result).toBe(-1);
        });

        it("should update chat_tokens_refreshed_at with current date", async () => {
            const beforeCall = new Date();

            const mockUser = {
                user_id: mockUserId,
                chat_tokens: 50,
            };

            const mockFindOneAndUpdate = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            });

            UserDB.findOneAndUpdate = mockFindOneAndUpdate;

            await chatTokens.decreaseTokens();

            const afterCall = new Date();
            const callArgs = mockFindOneAndUpdate.mock.calls[0][1];
            const updatedDate = callArgs.chat_tokens_refreshed_at;

            expect(updatedDate).toBeInstanceOf(Date);
            expect(updatedDate.getTime()).toBeGreaterThanOrEqual(
                beforeCall.getTime(),
            );
            expect(updatedDate.getTime()).toBeLessThanOrEqual(
                afterCall.getTime(),
            );
        });
    });
});
