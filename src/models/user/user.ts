import { UserDB, UserHealthAttributionsDB } from "@database/models/user";
import { UserHealthAttributions, UserInfoPayload } from "@dtypes/user";
import Logger from "@libs/logger";
import VaultService from "@services/vault";

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

            if (userHealthInfo) {
                Logger.error("USER_ALREADY_COMPLETED_QUIZ");
                throw new Error("USER_ALREADY_COMPLETED_QUIZ");
            }

            // 🔐 CHIFFRER chaque champ individuellement
            const encryptedHealthData = await VaultService.encryptFields({
                keyName: "health-data",
                data: health_attributions,
                context: this.user_id,
            });

            await Promise.all([
                UserDB.updateOne(
                    { user_id: this.user_id },
                    { quiz_finished: true, first_name, last_name },
                ),
                UserHealthAttributionsDB.create({
                    user_id: this.user_id,
                    ...encryptedHealthData, // Chaque champ est chiffré individuellement
                    created_at: new Date(),
                }),
            ]);

            Logger.info(
                `Health data encrypted field-by-field for user ${this.user_id}`,
            );
        } catch (error) {
            Logger.error(error);
            throw new Error("AN_ERROR_OCCURRED");
        }
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
                UserHealthAttributionsDB.findOne({ user_id: this.user_id }),
            ]);

            if (!userInfo) {
                Logger.error("User info not found");
                throw new Error("AN_ERROR_OCCURRED");
            }

            // 🔓 DÉCHIFFRER chaque champ individuellement
            let healthData: UserHealthAttributions | Record<string, unknown> =
                {};
            if (userHealthInfo) {
                try {
                    const { ...encryptedFields } = userHealthInfo.toObject();

                    const decrypted =
                        await VaultService.decryptFields<UserHealthAttributions>(
                            {
                                keyName: "health-data",
                                encryptedData: encryptedFields,
                                context: this.user_id,
                            },
                        );

                    healthData = {
                        ...decrypted,
                        user_id: this.user_id,
                        created_at: userHealthInfo.created_at,
                    };

                    Logger.info(
                        `Health data decrypted field-by-field for user ${this.user_id}`,
                    );
                } catch (error) {
                    Logger.error(
                        `Failed to decrypt health data for user ${this.user_id}`,
                        error,
                    );
                }
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
                health: healthData as UserHealthAttributions,
            };

            return { user: userPayload };
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }
}

export default User;
