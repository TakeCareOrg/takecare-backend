jest.mock("../../src/config/secrets", () => ({
    getSecrets: jest.fn(() => ({
        together: {
            TOGETHER_API_KEY: "fake-api-key",
        },
        chat: {
            CHAT_START_MESSAGE: "I'm a fake chatbot who's there to not help you",
        },
    })),
}));

import { Chat } from "../../src/models/chat/chat";
import { Together } from "together-ai";
import Logger from "@libs/logger";
import TakeCareUserChatTokens from "../../src/models/user/chat-tokens";

jest.mock("together-ai");
jest.mock("@libs/logger");
jest.mock("../../src/models/user/chat-tokens");

describe("Chat", () => {
    let chat: Chat;
    let mockDecrementTokens: jest.Mock;
    let mockChatCompletionsCreate: jest.Mock;

    beforeEach(() => {
        chat = new Chat("user123");
        mockDecrementTokens = jest.fn();
        mockChatCompletionsCreate = jest.fn();

        (TakeCareUserChatTokens as jest.Mock).mockImplementation(() => ({
            decreaseTokens: mockDecrementTokens,
        }));

        (Together as unknown as jest.Mock).mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockChatCompletionsCreate,
                },
            },
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should throw an error if user_id is not provided", async () => {
        const invalidChat = new Chat("");
        await expect(invalidChat.sendMessage([])).rejects.toThrow(
            "UNAUTHORIZED",
        );
    });

    it("should throw an error if sending the message fails", async () => {
        const errorMessage = "Error sending message to Together API";

        mockChatCompletionsCreate.mockRejectedValue(new Error(errorMessage));

        await expect(
            chat.sendMessage([{ role: "user", content: "Hello" }]),
        ).rejects.toThrow("ERROR_SENDING_CHAT_MESSAGE");

        expect(Logger.error).toHaveBeenCalledWith(
            `Error sending message to Together API - error: Error: ${errorMessage}`,
        );
    });

    it("should return the assistant's response when message is successfully sent", async () => {
        const mockIterator = {
            [Symbol.asyncIterator]: jest.fn().mockReturnValue({
                next: jest
                    .fn()
                    .mockResolvedValueOnce({
                        value: {
                            choices: [
                                {
                                    delta: {
                                        content: "Hello, how can I assist you?",
                                    },
                                },
                            ],
                        },
                        done: false,
                    })
                    .mockResolvedValueOnce({
                        value: {
                            choices: [
                                { delta: { content: " How can I help?" } },
                            ],
                        },
                        done: false,
                    })
                    .mockResolvedValueOnce({
                        value: { choices: [{ delta: { content: "" } }] },
                        done: true,
                    }),
            }),
        };

        mockChatCompletionsCreate.mockResolvedValue(mockIterator);

        const result = await chat.sendMessage([
            { role: "user", content: "Hello" },
        ]);

        expect(result).toEqual({
            role: "assistant",
            content: "Hello, how can I assist you? How can I help?",
        });

        expect(mockDecrementTokens).toHaveBeenCalled();
    });

    it("should call decreaseTokens after a successful chat message", async () => {
        const mockIterator = {
            [Symbol.asyncIterator]: jest.fn().mockReturnValue({
                next: jest
                    .fn()
                    .mockResolvedValueOnce({
                        value: {
                            choices: [
                                {
                                    delta: {
                                        content: "Response from assistant",
                                    },
                                },
                            ],
                        },
                        done: false,
                    })
                    .mockResolvedValueOnce({
                        value: { choices: [{ delta: { content: "" } }] },
                        done: true,
                    }),
            }),
        };

        mockChatCompletionsCreate.mockResolvedValue(mockIterator);

        await chat.sendMessage([{ role: "user", content: "Hello" }]);

        expect(mockDecrementTokens).toHaveBeenCalledTimes(1);
    });

    it("should handle the case where the API response contains no content", async () => {
        const mockResponse = { choices: [] };

        mockChatCompletionsCreate.mockResolvedValue(mockResponse);

        await expect(
            chat.sendMessage([{ role: "user", content: "Hello" }]),
        ).rejects.toThrow("ERROR_SENDING_CHAT_MESSAGE");

        expect(mockDecrementTokens).not.toHaveBeenCalled();
    });

    it("should throw an error if API response is invalid format", async () => {
        const mockResponse = { choices: null };

        mockChatCompletionsCreate.mockResolvedValue(mockResponse);

        await expect(
            chat.sendMessage([{ role: "user", content: "Hello" }]),
        ).rejects.toThrow("ERROR_SENDING_CHAT_MESSAGE");

        expect(mockDecrementTokens).not.toHaveBeenCalled();
    });
});
