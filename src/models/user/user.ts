import { UserDB, UserHealthAttributionsDB } from "@database/models/user";
import {
    UserComplete,
    UserHealthAttributions,
    UserInfoPayload,
} from "@dtypes/user";
import Logger from "@libs/logger";

type UserHealthDataQuiz = Omit<
    UserHealthAttributions,
    "user_id" | "created_at"
> & {
    first_name: string;
    last_name: string;
};

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

            const [userInfo, userHealthInfo] = await Promise.all([
                UserDB.findOne({ user_id: this.user_id }),
                UserHealthAttributionsDB.findOne({
                    user_id: this.user_id,
                }).select("-_id -__v"),
            ]);

            if (!userInfo) {
                Logger.error("User info not found");
                throw new Error("AN_ERROR_OCCURRED");
            }

            const userPayload: UserInfoPayload = {
                user_id: this.user_id,
                email: user.email,
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

    async healthQuiz(healthData: UserHealthDataQuiz) {
        if (!this.user_id) {
            throw new Error("USER_ID_REQUIRED");
        }

        if (!healthData) {
            throw new Error("MISSING_HEALTH_DATA");
        }

        const { first_name, last_name, ...health_attributions } = healthData;

        try {
            const user = await UserDB.findOne({ user_id: this.user_id });

            if (!user) {
                Logger.error("USER_NOT_FOUND_FOR_HEALTH_QUIZ");
                throw new Error("USER_NOT_FOUND_FOR_HEALTH_QUIZ");
            }

            const userHealthInfo = await UserHealthAttributionsDB.findOne({
                user_id: this.user_id,
            });

            // Check if the user has already completed the quiz
            if (userHealthInfo) {
                Logger.error("USER_ALREADY_COMPLETED_QUIZ");
                throw new Error("USER_ALREADY_COMPLETED_QUIZ");
            }

            // Update user information and create health attributions
            // Use Promise.all to run both operations in parallel
            // and wait for both to complete
            await Promise.all([
                UserDB.updateOne(
                    { user_id: this.user_id },
                    { quiz_finished: true, first_name, last_name },
                ),
                await UserHealthAttributionsDB.create({
                    user_id: this.user_id,
                    ...health_attributions,
                }),
            ]);
        } catch (error) {
            Logger.error(error);
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async updateUser(user: UserComplete) {
        if (!user || !this.user_id) {
            throw new Error("AN_ERROR_OCCURRED");
        }
        try {
            const { health, ...userWitoutHealth } = user;
            await Promise.all([
                UserDB.updateOne({ user_id: this.user_id }, userWitoutHealth),
                UserHealthAttributionsDB.updateOne(
                    { user_id: this.user_id },
                    health,
                ),
            ]);
            return { success: true };
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async getHealthData() {
        if (!this.user_id) {
            throw new Error("AN_ERROR_OCCURRED");
        }
        try {
            const healthData = await UserHealthAttributionsDB.find({
                user_id: this.user_id,
            }).select("-_id -__v -user_id -created_at");
            return healthData[0];
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }
}

export default User;
