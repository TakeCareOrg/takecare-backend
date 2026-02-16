import jwt from "jsonwebtoken";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateToken,
    verifyToken,
    UserPayload,
} from "../../src/utils/jwt";
import Logger from "../../src/libs/logger";
import { getSecrets } from "../../src/config/secrets";

jest.mock("jsonwebtoken");
jest.mock("../../src/libs/logger");
jest.mock("../../src/config/secrets");
jest.mock("crypto", () => ({
    ...jest.requireActual("crypto"),
    randomUUID: jest.fn().mockReturnValue("mock-uuid-1234"),
}));

describe("JWT Utility Functions", () => {
    const MOCK_PRIVATE_KEY = Buffer.from("mock-private-key").toString("base64");
    const MOCK_PUBLIC_KEY = Buffer.from("mock-public-key").toString("base64");

    const mockUser: UserPayload = {
        user_id: "user123",
    };

    beforeEach(() => {
        (getSecrets as jest.Mock).mockReturnValue({
            jwt: {
                JWT_PRIVATE_KEY: MOCK_PRIVATE_KEY,
                JWT_PUBLIC_KEY: MOCK_PUBLIC_KEY,
            },
        });
        jest.clearAllMocks();
    });

    describe("generateAccessToken", () => {
        it("should generate a short-lived access token with RS256 and typ claim", () => {
            (jwt.sign as jest.Mock).mockReturnValue("mocked_access_token");

            const token = generateAccessToken(mockUser);

            expect(jwt.sign).toHaveBeenCalledWith(
                { ...mockUser, typ: "access" },
                "mock-private-key",
                { algorithm: "RS256", expiresIn: "15m" },
            );
            expect(token).toBe("mocked_access_token");
        });

        it("should throw an error if secrets are not initialized", () => {
            (getSecrets as jest.Mock).mockImplementation(() => {
                throw new Error(
                    "Secrets not initialized. Call setSecrets() after Vault init.",
                );
            });

            expect(() => generateAccessToken(mockUser)).toThrow(
                "Secrets not initialized",
            );
        });
    });

    describe("generateRefreshToken", () => {
        it("should generate a long-lived refresh token with a unique jti and typ claim", () => {
            (jwt.sign as jest.Mock).mockReturnValue("mocked_refresh_token");

            const result = generateRefreshToken("user123");

            expect(jwt.sign).toHaveBeenCalledWith(
                { user_id: "user123", jti: "mock-uuid-1234", typ: "refresh" },
                "mock-private-key",
                { algorithm: "RS256", expiresIn: "7d" },
            );
            expect(result.token).toBe("mocked_refresh_token");
            expect(result.tokenId).toBe("mock-uuid-1234");
        });
    });

    describe("verifyAccessToken", () => {
        it("should verify a valid access token with RS256 and correct typ", () => {
            (jwt.verify as jest.Mock).mockReturnValue({
                ...mockUser,
                typ: "access",
            });

            const result = verifyAccessToken("valid_token");

            expect(jwt.verify).toHaveBeenCalledWith(
                "valid_token",
                "mock-public-key",
                { algorithms: ["RS256"] },
            );
            expect(result).toEqual(mockUser);
        });

        it("should reject a refresh token used as access token", () => {
            (jwt.verify as jest.Mock).mockReturnValue({
                user_id: "user123",
                jti: "some-uuid",
                typ: "refresh",
            });

            expect(() => verifyAccessToken("refresh_token_as_access")).toThrow(
                "Invalid token",
            );
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should reject a token without typ claim", () => {
            (jwt.verify as jest.Mock).mockReturnValue(mockUser);

            expect(() => verifyAccessToken("token_without_typ")).toThrow(
                "Invalid token",
            );
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should throw an error if secrets are not initialized", () => {
            (getSecrets as jest.Mock).mockImplementation(() => {
                throw new Error(
                    "Secrets not initialized. Call setSecrets() after Vault init.",
                );
            });

            expect(() => verifyAccessToken("valid_token")).toThrow(
                "Secrets not initialized",
            );
        });

        it("should log an error and throw 'Invalid token' for an invalid token", () => {
            const error = new Error("jwt malformed");
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw error;
            });

            expect(() => verifyAccessToken("invalid_token")).toThrow(
                "Invalid token",
            );
            expect(Logger.error).toHaveBeenCalledWith(error);
        });
    });

    describe("verifyRefreshToken", () => {
        it("should verify a valid refresh token and return payload with jti and typ", () => {
            const mockPayload = {
                user_id: "user123",
                jti: "some-uuid",
                typ: "refresh",
            };
            (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

            const result = verifyRefreshToken("valid_refresh_token");

            expect(jwt.verify).toHaveBeenCalledWith(
                "valid_refresh_token",
                "mock-public-key",
                { algorithms: ["RS256"] },
            );
            expect(result).toEqual(mockPayload);
        });

        it("should reject an access token used as refresh token", () => {
            (jwt.verify as jest.Mock).mockReturnValue({
                user_id: "user123",
                typ: "access",
            });

            expect(() => verifyRefreshToken("access_token_as_refresh")).toThrow(
                "Invalid refresh token",
            );
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should reject a token without typ claim", () => {
            const mockPayload = { user_id: "user123", jti: "some-uuid" };
            (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

            expect(() => verifyRefreshToken("token_without_typ")).toThrow(
                "Invalid refresh token",
            );
            expect(Logger.error).toHaveBeenCalled();
        });

        it("should throw 'Invalid refresh token' for an expired refresh token", () => {
            const error = new Error("jwt expired");
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw error;
            });

            expect(() => verifyRefreshToken("expired_token")).toThrow(
                "Invalid refresh token",
            );
            expect(Logger.error).toHaveBeenCalledWith(error);
        });
    });

    describe("backward compatibility aliases", () => {
        it("generateToken should be an alias for generateAccessToken", () => {
            expect(generateToken).toBe(generateAccessToken);
        });

        it("verifyToken should be an alias for verifyAccessToken", () => {
            expect(verifyToken).toBe(verifyAccessToken);
        });
    });
});
