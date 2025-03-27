import { sendNewMessage } from "../../src/controllers/chat";
import { NextFunction, Request, Response } from "express";
import { Chat } from "@models/chat/chat";
import Logger from "@libs/logger";

// Mocking dependencies
jest.mock("@models/chat/chat");
jest.mock("@libs/logger");

describe("sendNewMessage", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            body: {},
            user: { user_id: "user123", email: "example@admin.com" },
        };
        next = jest.fn();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it("should return 401 if no user is authenticated", async () => {
        req.user = undefined;
        await sendNewMessage(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "UNAUTHORIZED" });
    });

    it("should return 400 if messages are missing in the request body", async () => {
        req.body = {}; // Aucune donnée "messages" dans le corps
        await sendNewMessage(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Missing required fields",
        });
    });

    it("should call Chat.sendMessage and return 200 on success", async () => {
        req.body = { messages: ["Hello", "World"] };

        const chatMessage = { id: "message1", text: "Hello World" };
        (Chat.prototype.sendMessage as jest.Mock).mockResolvedValue(
            chatMessage,
        );

        await sendNewMessage(req as Request, res as Response, next);

        expect(Chat.prototype.sendMessage).toHaveBeenCalledWith([
            "Hello",
            "World",
        ]);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ chat: chatMessage });
    });

    it("should return 500 if an error occurs in sending the message", async () => {
        req.body = { messages: ["Hello", "World"] };

        const error = new Error("Failed to send message");
        (Chat.prototype.sendMessage as jest.Mock).mockRejectedValue(error);

        await sendNewMessage(req as Request, res as Response, next);

        expect(Logger.error).toHaveBeenCalledWith(
            "500: Error: Failed to send message",
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "INTERNAL_SERVER_ERROR",
        });
    });
});
