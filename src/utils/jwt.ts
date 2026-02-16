import jwt from "jsonwebtoken";
import Logger from "@libs/logger";
import { getSecrets } from "@config/secrets";
import { randomUUID } from "crypto";

export interface UserPayload {
    user_id: string;
}

export interface AccessTokenPayload extends UserPayload {
    typ: "access";
}

export interface RefreshPayload {
    user_id: string;
    jti: string;
    typ: "refresh";
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
    const accessPayload: AccessTokenPayload = { ...payload, typ: "access" };
    return jwt.sign(accessPayload, privateKey, {
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

    const refreshPayload: RefreshPayload = {
        user_id: userId,
        jti: tokenId,
        typ: "refresh",
    };
    const token = jwt.sign(refreshPayload, privateKey, {
        algorithm: "RS256",
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return { token, tokenId };
};

// Verify an access token (verified with RSA public key)
// Rejects refresh tokens by checking the typ claim
export const verifyAccessToken = (token: string): UserPayload => {
    const { JWT_PUBLIC_KEY } = getSecrets().jwt;
    const publicKey = decodeKey(JWT_PUBLIC_KEY);

    try {
        const decoded = jwt.verify(token, publicKey, {
            algorithms: ["RS256"],
        }) as AccessTokenPayload;

        // Reject refresh tokens used as access tokens
        if (decoded.typ !== "access") {
            throw new Error("Invalid token type");
        }

        return { user_id: decoded.user_id };
    } catch (error) {
        Logger.error(error);
        throw new Error("Invalid token");
    }
};

// Verify a refresh token and return the full payload (including jti)
// Rejects access tokens by checking the typ claim
export const verifyRefreshToken = (token: string): RefreshPayload => {
    const { JWT_PUBLIC_KEY } = getSecrets().jwt;
    const publicKey = decodeKey(JWT_PUBLIC_KEY);

    try {
        const decoded = jwt.verify(token, publicKey, {
            algorithms: ["RS256"],
        }) as RefreshPayload;

        // Reject access tokens used as refresh tokens
        if (decoded.typ !== "refresh") {
            throw new Error("Invalid token type");
        }

        return decoded;
    } catch (error) {
        Logger.error(error);
        throw new Error("Invalid refresh token");
    }
};

// Backward compatibility aliases
export const generateToken = generateAccessToken;
export const verifyToken = verifyAccessToken;
