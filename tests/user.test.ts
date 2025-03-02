// import { Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import { register, login } from "../src/controllers/auth";
// import { getUserInfo } from "../src/controllers/user";
// import { generateToken } from "../src/utils/jwt";
// import { users } from "../src/types/user";
// import Logger from "../src/libs/logger";

// // Mock dependencies
// jest.mock("bcryptjs");
// jest.mock("@utils/jwt");
// jest.mock("@dtypes/user", () => ({
//     users: [],
// }));
// jest.mock("@libs/logger", () => ({
//     error: jest.fn(),
// }));

// describe("Auth Controllers", () => {
//     let mockRequest: Partial<Request>;
//     let mockResponse: Partial<Response>;
//     let responseJson: jest.Mock;
//     let responseStatus: jest.Mock;

//     beforeEach(() => {
//         // Clear users array before each test
//         users.length = 0;

//         // Reset mocks
//         jest.clearAllMocks();

//         // Setup mock request and response
//         responseJson = jest.fn().mockReturnValue({ end: jest.fn() });
//         responseStatus = jest.fn().mockReturnThis();

//         mockRequest = {
//             body: {},
//         };

//         mockResponse = {
//             json: responseJson,
//             status: responseStatus,
//         };
//     });

//     describe("register controller", () => {
//         it("should return 400 if required fields are missing", async () => {
//             // Arrange
//             mockRequest.body = { first_name: "John", last_name: "Doe" };

//             // Act
//             await register(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(responseStatus).toHaveBeenCalledWith(400);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "Missing required fields",
//             });
//         });

//         it("should return 400 if email is already in use", async () => {
//             // Arrange
//             users.push({
//                 user_id: "123",
//                 first_name: "Existing",
//                 last_name: "User",
//                 email: "test@example.com",
//                 password: "hashedpassword",
//                 createdAt: new Date(),
//             });

//             mockRequest.body = {
//                 first_name: "John",
//                 last_name: "Doe",
//                 email: "test@example.com",
//                 password: "password123",
//             };

//             // Act
//             await register(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(responseStatus).toHaveBeenCalledWith(400);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "Username or email already in use",
//             });
//         });

//         it("should successfully register a new user", async () => {
//             // Arrange
//             mockRequest.body = {
//                 first_name: "John",
//                 last_name: "Doe",
//                 email: "new@example.com",
//                 password: "password123",
//             };

//             // Mock bcrypt hash
//             (bcrypt.hash as jest.Mock).mockResolvedValue("hashedpassword");

//             // Act
//             await register(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
//             expect(users.length).toBe(1);
//             expect(users[0].email).toBe("new@example.com");
//             expect(users[0].password).toBe("hashedpassword");
//             expect(responseStatus).toHaveBeenCalledWith(200);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "User registered successfully",
//             });
//         });

//         it("should return 500 if an error occurs", async () => {
//             // Arrange
//             mockRequest.body = {
//                 first_name: "John",
//                 last_name: "Doe",
//                 email: "new@example.com",
//                 password: "password123",
//             };

//             // Mock bcrypt hash to throw error
//             const error = new Error("Hash failed");
//             (bcrypt.hash as jest.Mock).mockRejectedValue(error);

//             // Act
//             await register(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(Logger.error).toHaveBeenCalledWith(`500: ${error}`);
//             expect(responseStatus).toHaveBeenCalledWith(500);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "Internal server error",
//             });
//         });
//     });

//     describe("login controller", () => {
//         beforeEach(() => {
//             // Add a test user for login tests
//             users.push({
//                 user_id: "123",
//                 first_name: "Test",
//                 last_name: "User",
//                 email: "test@example.com",
//                 password: "hashedpassword",
//                 createdAt: new Date(),
//             });
//         });

//         it("should return 400 if user is not found", async () => {
//             // Arrange
//             mockRequest.body = {
//                 email: "nonexistent@example.com",
//                 password: "password123",
//             };

//             // Act
//             await login(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(Logger.error).toHaveBeenCalledWith(
//                 "400: Invalid credentials",
//             );
//             expect(responseStatus).toHaveBeenCalledWith(400);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "Invalid credentials",
//             });
//         });

//         it("should return 400 if password is invalid", async () => {
//             // Arrange
//             mockRequest.body = {
//                 email: "test@example.com",
//                 password: "wrongpassword",
//             };
//             (bcrypt.compare as jest.Mock).mockResolvedValue(false);

//             // Act
//             await login(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(bcrypt.compare).toHaveBeenCalledWith(
//                 "wrongpassword",
//                 "hashedpassword",
//             );
//             expect(Logger.error).toHaveBeenCalledWith(
//                 "400: Invalid credentials",
//             );
//             expect(responseStatus).toHaveBeenCalledWith(400);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "Invalid credentials",
//             });
//         });

//         it("should return a token if credentials are valid", async () => {
//             // Arrange
//             mockRequest.body = {
//                 email: "test@example.com",
//                 password: "correctpassword",
//             };
//             (bcrypt.compare as jest.Mock).mockResolvedValue(true);
//             (generateToken as jest.Mock).mockReturnValue("valid-token");

//             // Act
//             await login(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(bcrypt.compare).toHaveBeenCalledWith(
//                 "correctpassword",
//                 "hashedpassword",
//             );
//             expect(generateToken).toHaveBeenCalledWith({
//                 user_id: "123",
//                 email: "test@example.com",
//             });
//             expect(responseJson).toHaveBeenCalledWith({ token: "valid-token" });
//         });

//         it("should return 500 if token generation fails", async () => {
//             // Arrange
//             mockRequest.body = {
//                 email: "test@example.com",
//                 password: "correctpassword",
//             };
//             (bcrypt.compare as jest.Mock).mockResolvedValue(true);

//             const error = new Error("Token generation failed");
//             (generateToken as jest.Mock).mockImplementation(() => {
//                 throw error;
//             });

//             // Act
//             await login(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(Logger.error).toHaveBeenCalledWith(`500: ${error}`);
//             expect(responseStatus).toHaveBeenCalledWith(500);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "Internal server error",
//             });
//         });
//     });
// });

// describe("User Controller", () => {
//     let mockRequest: Partial<Request>;
//     let mockResponse: Partial<Response>;
//     let responseJson: jest.Mock;
//     let responseStatus: jest.Mock;

//     beforeEach(() => {
//         // Reset mocks
//         jest.clearAllMocks();

//         // Setup mock request and response
//         responseJson = jest.fn();
//         responseStatus = jest.fn().mockReturnValue({ json: responseJson });

//         mockRequest = {
//             user: undefined,
//         };

//         mockResponse = {
//             json: responseJson,
//             status: responseStatus,
//         };
//     });

//     describe("getUserInfo controller", () => {
//         it("should return user information when user exists in request", () => {
//             // Arrange
//             const mockUser = {
//                 user_id: "123",
//                 email: "test@example.com",
//             };

//             mockRequest.user = mockUser;

//             // Act
//             getUserInfo(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(console.log).toHaveBeenCalledWith(mockUser);
//             expect(responseJson).toHaveBeenCalledWith({ user_id: mockUser });
//         });

//         it("should return user_id as undefined when no user in request", () => {
//             // Arrange - mockRequest.user is already undefined

//             // Act
//             getUserInfo(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(console.log).toHaveBeenCalledWith(undefined);
//             expect(responseJson).toHaveBeenCalledWith({ user_id: undefined });
//         });

//         it("should handle errors and return 500 status code", () => {
//             // Arrange
//             mockRequest.user = { user_id: "123" };

//             // Make response.json throw an error
//             mockResponse.json = jest.fn().mockImplementation(() => {
//                 throw new Error("Test error");
//             });

//             // Act
//             getUserInfo(
//                 mockRequest as Request,
//                 mockResponse as Response,
//                 jest.fn(),
//             );

//             // Assert
//             expect(responseStatus).toHaveBeenCalledWith(500);
//             expect(responseJson).toHaveBeenCalledWith({
//                 message: "Internal server error",
//             });
//         });
//     });
// });
