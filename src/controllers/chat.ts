import { RequestMiddleware } from "@dtypes/express";
import Logger from "@libs/logger";
import { Chat } from "@models/chat/chat";

const sendNewMessage: RequestMiddleware = async (req, res) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "UNAUTHORIZED" });

    const { messages } = req.body;
    if (!messages || messages.length === 0)
        return res.status(400).json({ message: "Missing required fields" });

    try {
        const chat = new Chat(user.user_id);
        const chatMessage = await chat.sendMessage(messages);
        res.status(200).json({ chat: chatMessage });
    } catch (error) {
        Logger.error(`500: ${error}`);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR" });
    }
};

export { sendNewMessage };
