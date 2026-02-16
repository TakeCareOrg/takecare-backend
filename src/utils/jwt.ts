import jwt from "jsonwebtoken";
import Logger from "@libs/logger";
import { getSecrets } from "@config/secrets";
import { randomUUID } from "crypto";

export interface UserPayload {
    user_id: string;
}

export interface RefreshPayload {
    user_id: string;
    jti: string;
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function decodeKey(base64Key: string): string {
    return Buffer.from(base64Key, "base64").toString("utf-8");
}

// Generate a short-lived access token (signed with RSA private key)
export const generateAccessToken = (payload: UserPayload) => {
    const { JWT_PRIVATE_KEY } = getSecrets().jwt;
    const privateKey = decodeKey(JWT_PRIVATE_KEY);
    return jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
};

// Generate a long-lived refresh token with a unique ID (jti)
export const generateRefreshToken = (
    userId: string,
): { token: string; tokenId: string } => {
    const { JWT_PRIVATE_KEY } = getSecrets().jwt;
    const privateKey = decodeKey(JWT_PRIVATE_KEY);
    const tokenId = randomUUID();

    const token = jwt.sign({ user_id: userId, jti: tokenId }, privateKey, {
        algorithm: "RS256",
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return { token, tokenId };
};

// Verify an access token (verified with RSA public key)
export const verifyAccessToken = (token: string): UserPayload => {
    const { JWT_PUBLIC_KEY } = getSecrets().jwt;
    const publicKey = decodeKey(JWT_PUBLIC_KEY);

    try {
        return jwt.verify(token, publicKey, {
            algorithms: ["RS256"],
        }) as UserPayload;
    } catch (error) {
        Logger.error(error);
        throw new Error("Invalid token");
    }
};

// Verify a refresh token and return the full payload (including jti)
export const verifyRefreshToken = (token: string): RefreshPayload => {
    const { JWT_PUBLIC_KEY } = getSecrets().jwt;
    const publicKey = decodeKey(JWT_PUBLIC_KEY);

    try {
        return jwt.verify(token, publicKey, {
            algorithms: ["RS256"],
        }) as RefreshPayload;
    } catch (error) {
        Logger.error(error);
        throw new Error("Invalid refresh token");
    }
};

// Backward compatibility aliases
export const generateToken = generateAccessToken;
export const verifyToken = verifyAccessToken;
