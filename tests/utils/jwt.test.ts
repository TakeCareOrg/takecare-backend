import jwt from "jsonwebtoken";
import { generateToken, verifyToken, UserPayload } from "../../src/utils/jwt";
import Logger from "@libs/logger";
import * as secrets from "../../src/config/secrets";

jest.mock("jsonwebtoken");
jest.mock("@libs/logger");
jest.mock("../../src/config/secrets");

describe("JWT Utility Functions", () => {
    const SECRET_KEY = "mysecret";
    const mockUser: UserPayload = {
        user_id: "user123",
    };

    beforeEach(() => {
        (secrets.getSecrets as jest.Mock).mockReturnValue({
            jwt: {
                JWT_SECRET: SECRET_KEY,
            },
        });

        jest.clearAllMocks();
    });

    describe("generateToken", () => {
        it("should generate a JWT token", () => {
            (jwt.sign as jest.Mock).mockReturnValue("mocked_token");

            const token = generateToken(mockUser);

            expect(jwt.sign).toHaveBeenCalledWith(mockUser, SECRET_KEY, {
                expiresIn: "1h",
            });
            expect(token).toBe("mocked_token");
        });

        it("should throw an error if JWT_SECRET is not defined", () => {
            (secrets.getSecrets as jest.Mock).mockReturnValue({
                jwt: {
                    JWT_SECRET: undefined,
                },
            });

            expect(() => generateToken(mockUser)).toThrow(
                "JWT_SECRET is not defined",
            );
        });
    });

    describe("verifyToken", () => {
        it("should verify a valid token", () => {
            (jwt.verify as jest.Mock).mockReturnValue(mockUser);

            const result = verifyToken("valid_token");

            expect(jwt.verify).toHaveBeenCalledWith("valid_token", SECRET_KEY);
            expect(result).toEqual(mockUser);
        });

        it("should throw an error if JWT_SECRET is not defined", () => {
            (secrets.getSecrets as jest.Mock).mockReturnValue({
                jwt: {
                    JWT_SECRET: undefined,
                },
            });

            expect(() => verifyToken("valid_token")).toThrow(
                "JWT_SECRET is not defined",
            );
        });

        it("should log an error and throw 'Invalid token' for an invalid token", () => {
            const error = new Error("jwt malformed");
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw error;
            });

            expect(() => verifyToken("invalid_token")).toThrow("Invalid token");
            expect(Logger.error).toHaveBeenCalledWith(error);
        });
    });
});
