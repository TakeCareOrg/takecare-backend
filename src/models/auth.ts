import { UserDB } from "@database/models/user";
import { VerificationCodeDB } from "@database/models/verificationCodes";
import Logger from "@libs/logger";
import sendVericationEmail from "@services/mail/templates/email-verification";
import sendResetPasswordEmail from "@services/mail/templates/reset-password";
import { generateToken } from "@utils/jwt";
import bcrypt from "bcryptjs";
import { randomUUID, randomInt } from "crypto";

class Auth {
    constructor() {}

    private async isUniqueUser(email: string) {
        try {
            const user = await UserDB.findOne({ email });
            return !!user;
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

    async login(email: string, password: string, isAdmin = false) {
        if (!email || !password) {
            throw new Error("MISSING_FIELDS");
        }

        try {
            const user = await UserDB.findOne({ email });

            if (!user) {
                throw new Error("AN_ERROR_OCCURRED_USER_NOT_FOUND");
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                throw new Error("AN_ERROR_OCCURRED_IS_NOT_MATCH");
            }

            if (isAdmin && !user.role?.includes("admin")) {
                throw new Error("UNAUTHORIZED");
            }

            const token = generateToken({ user_id: user.user_id });

            return { token };
        } catch (e) {
            Logger.error(`Login error: ${e}`);
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

    /**
     * Step 1: User provides their email.
     * We generate a 6-digit code, persist it with is_reset=true, and email it.
     * Always returns a generic success message to avoid user enumeration.
     */
    async forgotPassword(email: string) {
        if (!email) {
            throw new Error("MISSING_FIELDS");
        }

        try {
            const user = await UserDB.findOne({ email });

            if (!user) {
                // Do not reveal whether the email exists
                return;
            }

            // Remove any existing reset codes for this user
            await VerificationCodeDB.deleteMany({
                user_id: user.user_id,
                is_reset: true,
            });

            const code = randomInt(100000, 999999);

            const verifyCode = new VerificationCodeDB({
                user_id: user.user_id,
                code,
                is_reset: true,
            });

            await verifyCode.save();

            await sendResetPasswordEmail({
                code: code.toString(),
                to: user.email,
            });
        } catch (error) {
            Logger.error(`Forgot password error: ${error}`);
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    /**
     * Step 2: User submits the 6-digit code they received.
     * If valid, returns a short-lived JWT so they can call resetPassword.
     */
    async verifyResetCode(email: string, code: string) {
        if (!email || !code) {
            throw new Error("MISSING_FIELDS");
        }

        try {
            const user = await UserDB.findOne({ email });

            if (!user) {
                throw new Error("INVALID_CODE");
            }

            const verificationCode = await VerificationCodeDB.findOne({
                user_id: user.user_id,
                code: Number(code),
                is_reset: true,
            });

            if (!verificationCode) {
                throw new Error("INVALID_CODE");
            }

            // Code is valid — remove it so it can't be reused
            await verificationCode.deleteOne();

            // Return a short-lived token the client will send to reset-password
            const token = generateToken({ user_id: user.user_id });

            return { token };
        } catch (error) {
            if (error instanceof Error && error.message === "INVALID_CODE") {
                throw error;
            }
            Logger.error(`Verify reset code error: ${error}`);
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    /**
     * Step 3: Authenticated via the short-lived token from step 2.
     * Hashes and persists the new password.
     */
    async resetPassword(userId: string, newPassword: string) {
        if (!userId || !newPassword) {
            throw new Error("MISSING_FIELDS");
        }

        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const result = await UserDB.updateOne(
                { user_id: userId },
                { password: hashedPassword },
            );

            if (result.matchedCount === 0) {
                throw new Error("USER_NOT_FOUND");
            }
        } catch (error) {
            if (error instanceof Error && error.message === "USER_NOT_FOUND") {
                throw error;
            }
            Logger.error(`Reset password error: ${error}`);
            throw new Error("AN_ERROR_OCCURRED");
        }
    }
}

export { Auth };
