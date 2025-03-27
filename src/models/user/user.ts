import { UserDB, UserHealthAttributionsDB } from "@database/models/user";
import { UserHealthAttributions, UserInfoPayload } from "@dtypes/user";
import Logger from "@libs/logger";

class User {
    user_id: string;
    constructor(user_id: string) {
        this.user_id = user_id;
    }

    async getUserInfo() {
        if (!this.user_id) {
            throw new Error("AN_ERROR_OCCURRED");
        }

        try {
            const user = await UserDB.findOne({ user_id: this.user_id });

            if (!user) {
                Logger.error("User not found");
                throw new Error("AN_ERROR_OCCURRED");
            }

            const email = user.email;

            const [userInfo, userHealthInfo] = await Promise.all([
                UserDB.findOne({ user_id: this.user_id }),
                UserHealthAttributionsDB.findOne({ user_id: this.user_id }),
            ]);

            if (!userInfo) {
                Logger.error("User info not found");
                throw new Error("AN_ERROR_OCCURRED");
            }

            const userPayload: UserInfoPayload = {
                user_id: this.user_id,
                email: email,
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                verified: userInfo.verified,
                role: userInfo.role,
                quiz_finished: userInfo.quiz_finished,
                chat_tokens: userInfo.chat_tokens,
                chat_tokens_refreshed_at: userInfo.chat_tokens_refreshed_at,
                avatar: userInfo.avatar,
                health: userHealthInfo || ({} as UserHealthAttributions),
            };

            return { user: userPayload };
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }
}

export default User;
