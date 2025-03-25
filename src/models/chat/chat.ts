import { Together } from "together-ai";
import { formatMessages } from "@utils/chat";
import { ChatMessage } from "@dtypes/chat";
import Logger from "@libs/logger";
import TakeCareUserChatTokens from "../user/chat-tokens";

const MAX_TOKENS = undefined;
const TEMPERATURE = 0.7;
const TOP_P = 0.7;
const TOP_K = 50;
const REPETITION_PENALTY = 1;
const STOP = ["<|im_end|>"];

class Chat {
    user_id: string;
    constructor(user_id: string) {
        this.user_id = user_id;
    }

    async sendMessage(messages: ChatMessage[]) {
        if (!this.user_id) {
            throw new Error("UNAUTHORIZED");
        }

        try {
            const together = new Together({
                apiKey: process.env.TOGETHER_API_KEY,
            });
            // Format messages
            const formattedMessages = formatMessages(messages);

            // Send message
            const response = await together.chat.completions.create({
                messages: formattedMessages,
                model: "Qwen/Qwen2.5-72B-Instruct-Turbo",
                max_tokens: MAX_TOKENS,
                temperature: TEMPERATURE,
                top_p: TOP_P,
                top_k: TOP_K,
                repetition_penalty: REPETITION_PENALTY,
                stop: STOP,
                stream: true,
            });

            let fullResponse = "";
            for await (const token of response) {
                fullResponse += token.choices[0]?.delta?.content || "";
            }

            await new TakeCareUserChatTokens(this.user_id).decreaseTokens();

            return { role: "assistant", content: fullResponse };
        } catch (error) {
            Logger.error(
                `Error sending message to Together API - error: ${error}`,
            );
            throw new Error("ERROR_SENDING_CHAT_MESSAGE");
        }
    }
}

export { Chat };
