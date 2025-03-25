import { UserAttributionsDB } from "@database/models/user";
import Logger from "@libs/logger";

class UserChatTokens {
    user_id: string;
    constructor(user_id: string) {
        this.user_id = user_id;
    }

    async decreaseTokens() {
        if (!this.user_id) {
            throw new Error("UNAUTHORIZED");
        }

        try {
            // Decrease tokens
            const user = await UserAttributionsDB.findOneAndUpdate(
                { user_id: this.user_id },
                {
                    $inc: { chat_tokens: -1 },
                    chat_tokens_refreshed_at: new Date(),
                },
                { new: true },
            ).lean();

            if (!user) {
                throw new Error("USER_NOT_FOUND");
            }

            return user.chat_tokens;
        } catch (error) {
            Logger.error(`Error decreasing chat tokens - error: ${error}`);
            throw new Error("INTERNAL_SERVER_ERROR");
        }
    }
}

export default UserChatTokens;
