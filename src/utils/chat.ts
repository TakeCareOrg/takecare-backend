import { ChatMessage } from "@dtypes/chat";

export function formatMessages(messages: ChatMessage[]): ChatMessage[] {
    if (process.env.CHAT_START_MESSAGE === undefined) {
        throw new Error("CHAT_START_MESSAGE is not defined");
    }

    const systemMessage: ChatMessage = {
        role: "system",
        content: process.env.CHAT_START_MESSAGE,
    };

    return [systemMessage, ...messages];
}
