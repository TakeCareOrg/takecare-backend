import { UserDB } from "@database/models/user";
import Logger from "@libs/logger";
import { generateToken } from "@utils/jwt";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

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
            throw new Error("AN_ERROR_OCCURRED");
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

            const token = generateToken({
                user_id: user.user_id,
                email: user.email,
            });

            // Save the user
            await user.save();

            Logger.info(`User created: ${user.email}`);
            return { token };
        } catch (e) {
            console.log(e);

            Logger.error("500: Internal server error");
            throw new Error("AN_ERROR_OCCURRED");
        }
    }

    async login(email: string, password: string) {
        if (!email || !password) {
            throw new Error("AN_ERROR_OCCURRED");
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

            const token = generateToken({
                user_id: user.user_id,
                email: user.email,
            });

            return { token };
        } catch {
            throw new Error("AN_ERROR_OCCURRED");
        }
    }
}

export { Auth };
