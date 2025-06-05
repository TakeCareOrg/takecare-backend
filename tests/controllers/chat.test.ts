import { sendNewMessage } from "../../src/controllers/chat";
import { NextFunction, Request, Response } from "express";
import { Chat } from "@models/chat/chat";
import Logger from "@libs/logger";
import { StatusCodes } from "http-status-codes";

// Mocking dependencies
jest.mock("@models/chat/chat");
jest.mock("@libs/logger");

describe("sendNewMessage", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let mockStatus: jest.Mock;
    let mockJson: jest.Mock;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        mockStatus = jest.fn().mockReturnThis();
        mockJson = jest.fn();

        req = {
            body: {},
            user: { user_id: "user123" },
        };

        res = {
            status: mockStatus,
            json: mockJson,
        };

        next = jest.fn();
    });

    describe("Authentication", () => {
        it("should return 401 when user is not authenticated", async () => {
            req.user = undefined;

            await sendNewMessage(req as Request, res as Response, next);

            expect(mockStatus).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
            expect(mockJson).toHaveBeenCalledWith({ message: "UNAUTHORIZED" });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("Request validation", () => {
        it("should return 400 when messages field is missing", async () => {
            req.body = {};

            await sendNewMessage(req as Request, res as Response, next);

            expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(mockJson).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });

        it("should return 400 when messages field is null", async () => {
            req.body = { messages: null };

            await sendNewMessage(req as Request, res as Response, next);

            expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(mockJson).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });

        it("should return 400 when messages field is empty array", async () => {
            req.body = { messages: [] };

            await sendNewMessage(req as Request, res as Response, next);

            expect(mockStatus).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
            expect(mockJson).toHaveBeenCalledWith({
                message: "Missing required fields",
            });
        });
    });

    describe("Successful message sending", () => {
        it("should successfully send message and return chat data", async () => {
            const mockMessages = ["Hello", "How are you?"];
            const mockChatResponse = {
                id: "chat_123",
                messages: mockMessages,
                timestamp: "2024-01-01T00:00:00Z",
            };

            req.body = { messages: mockMessages };

            const mockSendMessage = jest
                .fn()
                .mockResolvedValue(mockChatResponse);
            (Chat as jest.MockedClass<typeof Chat>).mockImplementation(
                () =>
                    ({
                        sendMessage: mockSendMessage,
                    }) as any,
            );

            await sendNewMessage(req as Request, res as Response, next);

            expect(mockSendMessage).toHaveBeenCalledWith(mockMessages);
            expect(mockStatus).toHaveBeenCalledWith(StatusCodes.OK);
            expect(mockJson).toHaveBeenCalledWith({ chat: mockChatResponse });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("Error handling", () => {
        it("should handle database connection errors", async () => {
            const mockMessages = ["Test message"];
            req.body = { messages: mockMessages };

            const dbError = new Error("Database connection failed");
            const mockSendMessage = jest.fn().mockRejectedValue(dbError);
            (Chat as jest.MockedClass<typeof Chat>).mockImplementation(
                () =>
                    ({
                        sendMessage: mockSendMessage,
                    }) as any,
            );

            await sendNewMessage(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                "500: Error: Database connection failed",
            );
            expect(mockStatus).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(mockJson).toHaveBeenCalledWith({
                message: "INTERNAL_SERVER_ERROR",
            });
        });

        it("should handle validation errors from Chat service", async () => {
            const mockMessages = ["Invalid message content"];
            req.body = { messages: mockMessages };

            const validationError = new Error(
                "Message content violates policy",
            );
            const mockSendMessage = jest
                .fn()
                .mockRejectedValue(validationError);
            (Chat as jest.MockedClass<typeof Chat>).mockImplementation(
                () =>
                    ({
                        sendMessage: mockSendMessage,
                    }) as any,
            );

            await sendNewMessage(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                "500: Error: Message content violates policy",
            );
            expect(mockStatus).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(mockJson).toHaveBeenCalledWith({
                message: "INTERNAL_SERVER_ERROR",
            });
        });

        it("should handle unexpected errors gracefully", async () => {
            const mockMessages = ["Any message"];
            req.body = { messages: mockMessages };

            const unexpectedError = new TypeError(
                "Cannot read property 'x' of undefined",
            );
            const mockSendMessage = jest
                .fn()
                .mockRejectedValue(unexpectedError);
            (Chat as jest.MockedClass<typeof Chat>).mockImplementation(
                () =>
                    ({
                        sendMessage: mockSendMessage,
                    }) as any,
            );

            await sendNewMessage(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith(
                "500: TypeError: Cannot read property 'x' of undefined",
            );
            expect(mockStatus).toHaveBeenCalledWith(
                StatusCodes.INTERNAL_SERVER_ERROR,
            );
            expect(mockJson).toHaveBeenCalledWith({
                message: "INTERNAL_SERVER_ERROR",
            });
        });
    });
});
