import jwt from "jsonwebtoken";
import Logger from "@libs/logger";
import { getSecrets } from "@config/secrets";

export interface UserPayload {
    user_id: string;
}

// Generate a JWT for a user
export const generateToken = (payload: UserPayload) => {
    const { JWT_SECRET } = getSecrets().jwt;

    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined");
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
};

// Verify a JWT
export const verifyToken = (token: string): UserPayload => {
    const { JWT_SECRET } = getSecrets().jwt;

    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined");
    }

    try {
        return jwt.verify(token, JWT_SECRET) as UserPayload;
    } catch (error) {
        Logger.error(error);
        throw new Error("Invalid token");
    }
};
