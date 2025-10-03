import { Together } from "together-ai";
import { formatMessages } from "@utils/chat";
import { ChatMessage } from "@dtypes/chat";
import Logger from "@libs/logger";
import TakeCareUserChatTokens from "../user/chat-tokens";
import fs from "fs";
import FormData from "form-data";
import axios from "axios";

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
        if (!this.user_id) throw new Error("UNAUTHORIZED");

        try {
            const together = new Together({
                apiKey: process.env.TOGETHER_API_KEY,
            });
            const formattedMessages = formatMessages(messages);

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

    async transcribeAudio(filePath: string): Promise<string> {
        if (!this.user_id) throw new Error("UNAUTHORIZED");

        try {
            const transcription = await this.transcribeWithGroq(filePath);
            return transcription;
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
    }

    private async transcribeWithGroq(filePath: string): Promise<string> {
        try {
            const form = new FormData();
            form.append("file", fs.createReadStream(filePath));
            form.append("model", "whisper-large-v3-turbo");
            form.append("response_format", "verbose_json");
            form.append("temperature", "0");

            const response = await axios.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    },
                    maxBodyLength: Infinity,
                },
            );

            const transcription = response.data.text || "";

            const hallucinations = (
                process.env.GROQ_HALLUCINATIONS || ""
            ).split(",");
            const lowerText = transcription.toLowerCase().trim();
            for (const hallucination of hallucinations) {
                if (lowerText.includes(hallucination))
                    throw new Error("NO_SPEECH_DETECTED");
            }

            if (transcription.trim().length < 3)
                throw new Error("NO_SPEECH_DETECTED");

            return transcription;
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                error.message === "NO_SPEECH_DETECTED"
            )
                throw error;
            throw new Error("TRANSCRIPTION_FAILED");
        }
    }
}

export { Chat };
