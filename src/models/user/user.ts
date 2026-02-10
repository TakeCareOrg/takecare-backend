import {
    UserDB,
    UserHealthAttributionsDB,
    UserUpdatesDB,
} from "@database/models/user";
import {
    UserComplete,
    UserHealthAttributions,
    UserInfoPayload,
} from "@dtypes/user";
import Logger from "@libs/logger";
import VaultService from "@services/vault";
import {
    CONSUMPTION_LEVELS,
    GENDER_OPTIONS,
    HEALTH_GOALS_OPTIONS,
    HEIGHT_UNITS,
    WEIGHT_UNITS,
} from "@constants/health";
import { z } from "zod";

type UserHealthDataQuiz = Omit<
    UserHealthAttributions,
    "user_id" | "created_at"
> & {
    first_name: string;
    last_name: string;
};

// DATA THAT WE RETURN TO THE USER
// const userInfoSchema = z.object({
//     first_name: z.string(),
//     last_name: z.string(),
//     email: z.string(),
//     verified: z.boolean(),
//     role: z.enum(["user", "admin"]),
//     quiz_finished: z.boolean(),
//     chat_tokens: z.number(),
// });

// DATA THAT WE RECEIVE FROM THE USER
const userHealthDataSchema = z.object({
    weight: z.number().optional().nullable(),
    weight_unit: z.enum(WEIGHT_UNITS).optional().nullable(),
    height: z.number().optional().nullable(),
    height_unit: z.enum(HEIGHT_UNITS).optional().nullable(),
    birth_date: z.iso.datetime().optional().nullable(),
    gender: z.enum(GENDER_OPTIONS).optional().nullable(),
    alcohol: z.enum(CONSUMPTION_LEVELS).optional().nullable(),
    smoking: z.enum(CONSUMPTION_LEVELS).optional().nullable(),
    health_goal: z.array(z.enum(HEALTH_GOALS_OPTIONS)).optional().nullable(),
    professional_help: z.array(z.string()).optional().nullable(),
    medication_treatment: z.array(z.string()).optional().nullable(),
    medical_treatments: z.array(z.string()).optional().nullable(),
    surgery_before: z.array(z.string()).optional().nullable(),
    chronic_illness: z.array(z.string()).optional().nullable(),
    allergies: z.array(z.string()).optional().nullable(),
    practice_sports: z.array(z.string()).optional().nullable(),
    stress_level: z.number().optional().nullable(),
    summary_message: z.string().optional().nullable(),
});

const userAttributionsSchema = z.object({
    user_id: z.string(),
    email: z.string().email(),
    appleId: z.string().optional(),
    social_conn: z.string().optional(),
    password: z.string(),
    created_at: z.date(),
    verified: z.boolean(),
    role: z.enum(["user", "admin"]).optional(),
    first_name: z.string(),
    last_name: z.string(),
    quiz_finished: z.boolean().optional(),
    chat_tokens: z.number(),
    chat_tokens_refreshed_at: z.date().optional(),
    avatar: z.string().optional(),
});

const updateUserInfoPayloadSchema = z
    .object({
        first_name: z.string().min(1).max(50).optional(),
        last_name: z.string().min(1).max(50).optional(),
        avatar: z.string().url().optional(),
    })
    .strict();

const userCompleteSchema = userAttributionsSchema.extend({
    health: userHealthDataSchema.extend({
        user_id: z.string(),
        created_at: z.date(),
        updated_at: z.date().optional(),
    }),
});

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
            const userInfo = await UserDB.findOne({ user_id: this.user_id });

            if (!userInfo) {
                Logger.error("User not found");
                throw new Error("AN_ERROR_OCCURRED");
            }

            const userHealthInfo = await UserHealthAttributionsDB.findOne({
                user_id: this.user_id,
            });

            // 🔓 DÉCHIFFRER chaque champ individuellement
            let healthData: UserHealthAttributions | Record<string, unknown> =
                {};
            if (userHealthInfo) {
                try {
                    const { ...encryptedFields } = userHealthInfo.toObject({
                        flattenObjectIds: true,
                    });

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
                } catch (error) {
                    Logger.error(
                        `Failed to decrypt health data for user ${this.user_id}`,
                        error,
                    );
                }
            }

            const userPayload: UserInfoPayload = {
                user_id: this.user_id,
                email: userInfo.email,
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

    async updateHealthData(
        healthData: Partial<
            Omit<UserHealthAttributions, "user_id" | "created_at">
        >,
    ): Promise<z.infer<typeof userHealthDataSchema>> {
        if (!this.user_id) {
            throw new Error("USER_ID_REQUIRED");
        }

        if (!healthData || Object.keys(healthData).length === 0) {
            throw new Error("MISSING_HEALTH_DATA");
        }

        const validatedHealthData = userHealthDataSchema.safeParse(healthData);
        if (validatedHealthData.error) {
            throw new Error(validatedHealthData.error.message);
        }

        try {
            const userHealthInfo = await UserHealthAttributionsDB.findOne({
                user_id: this.user_id,
            });

            if (!userHealthInfo) {
                throw new Error("USER_HEALTH_DATA_NOT_FOUND");
            }

            // 🔐 Chiffrer les nouveaux champs
            const encryptedHealthData = await VaultService.encryptFields({
                keyName: "health-data",
                data: validatedHealthData.data,
                context: this.user_id,
            });

            // Mettre à jour uniquement les champs fournis
            const [updatedUserHealthInfo] = await Promise.all([
                UserHealthAttributionsDB.findOneAndUpdate(
                    { user_id: this.user_id },
                    { $set: encryptedHealthData },
                    { new: true },
                ),
                UserUpdatesDB.create({
                    user_id: this.user_id,
                    type: "health_data",
                    updated_at: new Date(),
                }),
            ]);

            if (!updatedUserHealthInfo) {
                throw new Error("FAILED_TO_UPDATE_USER_HEALTH_DATA");
            }

            return validatedHealthData.data;
        } catch (error) {
            Logger.error(error);
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async updateUserInfo(
        data: z.infer<typeof updateUserInfoPayloadSchema>,
    ): Promise<Partial<z.infer<typeof userAttributionsSchema>>> {
        if (!this.user_id) {
            throw new Error("USER_ID_REQUIRED");
        }

        const validatedData = updateUserInfoPayloadSchema.safeParse(data);
        if (!validatedData.success) {
            throw new Error(validatedData.error.message);
        }

        try {
            const user = await UserDB.findOne({ user_id: this.user_id });

            if (!user) {
                throw new Error("USER_NOT_FOUND");
            }

            await Promise.all([
                UserDB.updateOne(
                    { user_id: this.user_id },
                    { $set: validatedData.data },
                ),
                UserUpdatesDB.create({
                    user_id: this.user_id,
                    type: "user_info",
                    updated_at: new Date(),
                }),
            ]);

            return validatedData.data;
        } catch (error) {
            Logger.error(error);
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async updateUser(user: UserComplete) {
        if (!user || !this.user_id) {
            throw new Error("AN_ERROR_OCCURRED");
        }

        // Validate the complete user data with Zod
        const validatedUser = userCompleteSchema.safeParse(user);
        if (!validatedUser.success) {
            Logger.error("User validation failed", validatedUser.error);
            throw new Error(validatedUser.error.message);
        }

        try {
            const { health, ...userWitoutHealth } = validatedUser.data;
            await Promise.all([
                UserDB.updateOne({ user_id: this.user_id }, userWitoutHealth),
                UserHealthAttributionsDB.updateOne(
                    { user_id: this.user_id },
                    health,
                ),
            ]);
            return { user: User };
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async getHealthData() {
        if (!this.user_id) {
            throw new Error("AN_ERROR_OCCURRED");
        }
        // try {
        //     const healthData = await UserHealthAttributionsDB.find({
        //         user_id: this.user_id,
        //     }).select("-_id -__v -user_id -created_at");
        //     if (!healthData) {
        //         throw new Error("AN_ERROR_OCCURRED");
        //     }
        //     return healthData[0];
        // } catch {
        //     throw new Error("AN_ERROR_OCCURRED");
        // }

        const userHealthInfo = await UserHealthAttributionsDB.findOne({
            user_id: this.user_id,
        });

        let healthData: UserHealthAttributions | Record<string, unknown> = {};
        if (userHealthInfo) {
            try {
                const { ...encryptedFields } = userHealthInfo.toObject({
                    flattenObjectIds: true,
                });

                const decrypted =
                    await VaultService.decryptFields<UserHealthAttributions>({
                        keyName: "health-data",
                        encryptedData: encryptedFields,
                        context: this.user_id,
                    });

                healthData = {
                    ...decrypted,
                    user_id: this.user_id,
                    created_at: userHealthInfo.created_at,
                };

                return healthData;
            } catch (error) {
                Logger.error(
                    `Failed to decrypt health data for user ${this.user_id}`,
                    error,
                );
            }
        }
    }
}

export default User;
