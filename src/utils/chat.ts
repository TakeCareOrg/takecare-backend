import { ChatMessage } from "@dtypes/chat";

export function formatMessages(messages: ChatMessage[]): ChatMessage[] {
    if (process.env.CHAT_START_MESSAGE === undefined) {
        throw new Error("CHAT_START_MESSAGE is not defined");
    }

    return [
        { role: "system", content: process.env.CHAT_START_MESSAGE },
        ...messages.map(({ role, content }) => ({ role, content })),
    ];
}
