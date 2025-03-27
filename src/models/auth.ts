import { UserDB } from "@database/models/user";
import { VerificationCodeDB } from "@database/models/verificationCodes";
import Logger from "@libs/logger";
import sendVericationEmail from "@services/mail/templates/email-verification";
import { generateToken } from "@utils/jwt";
import bcrypt from "bcryptjs";
import { randomUUID, randomInt } from "crypto";

class Auth {
    constructor() {}

    private async isUniqueUser(email: string) {
        try {
            const user = await UserDB.findOne({ email });

            if (user) {
                return true;
            } else {
                return false;
            }
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async createNewUser(email: string, password: string) {
        if (!email || !password) {
            throw new Error("MISSING_FIELDS");
        }

        try {
            const existingUser = await this.isUniqueUser(email);

            if (existingUser) {
                throw new Error("EXISTING_USER");
            }

            // hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = new UserDB({
                user_id: randomUUID(),
                email: email,
                password: hashedPassword,
                created_at: new Date().toISOString(),
            });

            const token = generateToken({ user_id: user.user_id });

            // Create a new verification code
            const verifyCode = new VerificationCodeDB({
                user_id: user.user_id,
                code: randomInt(100000, 999999),
            });

            // Save the user and verification code to the database
            await Promise.all([
                user.save(),
                verifyCode.save(),
                sendVericationEmail({
                    code: verifyCode.code.toString(),
                    to: user.email,
                }),
            ]);

            return { token };
        } catch (error) {
            Logger.error(`Error creating new user ${error}`);
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async login(email: string, password: string) {
        if (!email || !password) {
            throw new Error("MISSING_FIELDS");
        }

        try {
            const user = await UserDB.findOne({ email });

            if (!user) {
                throw new Error("AN_ERROR_OCCURRED");
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                throw new Error("AN_ERROR_OCCURRED");
            }

            const token = generateToken({ user_id: user.user_id });

            return { token };
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async verifyEmail(user_id: string, code: string) {
        if (!user_id || !code) {
            throw new Error("MISSING_FIELDS");
        }

        try {
            const verificationCode = await VerificationCodeDB.findOne({
                user_id: user_id,
                code: Number(code),
            });

            if (!verificationCode) {
                return false;
            }

            const res = await UserDB.updateOne(
                { user_id: user_id },
                { verified: true },
            );

            if (res.matchedCount === 0 || res.modifiedCount === 0) {
                throw new Error("AN_ERROR_OCCURRED");
            }

            await verificationCode.deleteOne();

            return true;
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }
}

export { Auth };
