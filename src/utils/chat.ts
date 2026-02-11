import { ChatMessage } from "@dtypes/chat";
import { getSecrets } from "@config/secrets";

export function formatMessages(messages: ChatMessage[]): ChatMessage[] {
    const { CHAT_START_MESSAGE } = getSecrets().chat;

    if (!CHAT_START_MESSAGE) {
        throw new Error("CHAT_START_MESSAGE is not defined");
    }

    const systemMessage: ChatMessage = {
        role: "system",
        content: CHAT_START_MESSAGE,
    };

    return [systemMessage, ...messages];
}
