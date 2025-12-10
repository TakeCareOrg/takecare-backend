import {
    initMailTransport,
    sendMail,
    verifyMailTransport,
} from "../../src/services/mail";
import Logger from "../../src/libs/logger";
import nodemailer from "nodemailer";

jest.mock("../../src/libs/logger");
jest.mock("nodemailer");

describe("Mail Service Tests", () => {
    let mockTransporter: {
        sendMail: jest.Mock;
        verify: jest.Mock;
    };

    beforeEach(() => {
        mockTransporter = {
            sendMail: jest.fn().mockResolvedValue(true),
            verify: jest.fn().mockResolvedValue(true),
        };

        (nodemailer.createTransport as jest.Mock).mockReturnValue(
            mockTransporter,
        );

        // Reset environment variables
        process.env.EMAIL_HOST = "smtp.gmail.com";
        process.env.EMAIL_PORT = "587";
        process.env.GOOGLE_APP_EMAIL = "test@gmail.com";
        process.env.GOOGLE_APP_PASSWORD = "password123";

        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up env vars
        delete process.env.EMAIL_HOST;
        delete process.env.EMAIL_PORT;
        delete process.env.GOOGLE_APP_EMAIL;
        delete process.env.GOOGLE_APP_PASSWORD;
    });

    describe("initMailTransport", () => {
        it("should initialize mail transporter successfully", () => {
            initMailTransport();

            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                host: "smtp.gmail.com",
                port: 587,
                secure: true,
                auth: {
                    user: "test@gmail.com",
                    pass: "password123",
                },
                service: "gmail",
            });
            expect(Logger.info).toHaveBeenCalledWith(
                "Mail transporter initialized successfully",
            );
        });

        it("should warn and return when EMAIL_HOST is not set", () => {
            delete process.env.EMAIL_HOST;

            initMailTransport();

            expect(Logger.warn).toHaveBeenCalledWith(
                "Email host or port not set, skipping mail transporter init",
            );
            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });

        it("should warn and return when EMAIL_PORT is not set", () => {
            delete process.env.EMAIL_PORT;

            initMailTransport();

            expect(Logger.warn).toHaveBeenCalledWith(
                "Email host or port not set, skipping mail transporter init",
            );
            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });

        it("should use default port 587 when EMAIL_PORT is invalid", () => {
            process.env.EMAIL_PORT = "invalid";

            initMailTransport();

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    port: 587,
                }),
            );
        });

        it("should use empty strings when auth credentials are not set", () => {
            delete process.env.GOOGLE_APP_EMAIL;
            delete process.env.GOOGLE_APP_PASSWORD;

            initMailTransport();

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    auth: {
                        user: "",
                        pass: "",
                    },
                }),
            );
        });

        it("should throw error when createTransport fails", () => {
            (nodemailer.createTransport as jest.Mock).mockImplementation(() => {
                throw new Error("Transport error");
            });

            expect(() => initMailTransport()).toThrow(
                "Failed to initialize mail transporter",
            );
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe("sendMail", () => {
        beforeEach(() => {
            initMailTransport();
            jest.clearAllMocks();
        });

        it("should send email successfully with single recipient", async () => {
            const options = {
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Test text",
                html: "<p>Test html</p>",
            };

            await sendMail(options);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: "no-reply@takecareai.com",
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Test text",
                html: "<p>Test html</p>",
            });
        });

        it("should send email successfully with multiple recipients", async () => {
            const options = {
                to: ["user1@example.com", "user2@example.com"],
                subject: "Test Subject",
                text: "Test text",
            };

            await sendMail(options);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: "no-reply@takecareai.com",
                to: "user1@example.com,user2@example.com",
                subject: "Test Subject",
                text: "Test text",
                html: undefined,
            });
        });

        it("should send email with only html content", async () => {
            const options = {
                to: "recipient@example.com",
                subject: "Test Subject",
                html: "<p>Only HTML</p>",
            };

            await sendMail(options);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: "no-reply@takecareai.com",
                to: "recipient@example.com",
                subject: "Test Subject",
                text: undefined,
                html: "<p>Only HTML</p>",
            });
        });

        it("should send email with only text content", async () => {
            const options = {
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Only text",
            };

            await sendMail(options);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: "no-reply@takecareai.com",
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Only text",
                html: undefined,
            });
        });

        it("should throw error when sendMail fails", async () => {
            mockTransporter.sendMail.mockRejectedValue(
                new Error("Send failed"),
            );

            const options = {
                to: "recipient@example.com",
                subject: "Test Subject",
                text: "Test",
            };

            await expect(sendMail(options)).rejects.toThrow(
                "Failed to send email",
            );
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe("verifyMailTransport", () => {
        beforeEach(() => {
            initMailTransport();
            jest.clearAllMocks();
        });

        it("should return true when verification succeeds", async () => {
            mockTransporter.verify.mockResolvedValue(true);

            const result = await verifyMailTransport();

            expect(result).toBe(true);
            expect(mockTransporter.verify).toHaveBeenCalled();
        });

        it("should return false when verification fails", async () => {
            mockTransporter.verify.mockRejectedValue(
                new Error("Verification failed"),
            );

            const result = await verifyMailTransport();

            expect(result).toBe(false);
            expect(Logger.error).toHaveBeenCalledWith(
                expect.stringContaining("Mail transport verification failed"),
            );
        });
    });
});
