import jwt from "jsonwebtoken";
import Logger from "@libs/logger";

export interface UserPayload {
    user_id: string;
    email: string;
}

// Generate a JWT for a user
export const generateToken = (userPayload: UserPayload) => {
    const SECRET_KEY = process.env.JWT_SECRET || "";
    if (!SECRET_KEY) {
        throw new Error("JWT_SECRET is not defined");
    }

    return jwt.sign(userPayload, SECRET_KEY, { expiresIn: "1h" });
};

// Verify a JWT
export const verifyToken = (token: string): UserPayload => {
    const SECRET_KEY = process.env.JWT_SECRET || "";
    if (!SECRET_KEY) {
        throw new Error("JWT_SECRET is not defined");
    }

    try {
        return jwt.verify(token, SECRET_KEY) as UserPayload;
    } catch (error) {
        Logger.error(error);
        throw new Error("Invalid token");
    }
};
