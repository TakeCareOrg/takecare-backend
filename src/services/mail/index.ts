import Logger from "@libs/logger";
import nodemailer from "nodemailer";
import { getSecrets } from "@config/secrets";

interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}

// Declare transporter at module level
let transporter: nodemailer.Transporter;

/**
 * Initialize the mail transporter
 */
export function initMailTransport(): void {
    const { EMAIL_HOST, EMAIL_PORT, GOOGLE_APP_EMAIL, GOOGLE_APP_PASSWORD } =
        getSecrets().mail;

    if (!EMAIL_HOST || !EMAIL_PORT) {
        Logger.warn(
            "Email host or port not set, skipping mail transporter init",
        );
        return;
    }

    try {
        transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: Number(EMAIL_PORT) || 587,
            secure: true,
            auth: {
                user: GOOGLE_APP_EMAIL || "",
                pass: GOOGLE_APP_PASSWORD || "",
            },
            service: "gmail",
        });

        Logger.info("Mail transporter initialized successfully");
    } catch (error) {
        Logger.error(
            `Failed to initialize mail transporter: ${JSON.stringify(error, null, 2)}`,
        );
        throw new Error("Failed to initialize mail transporter");
    }
}

/**
 * Sends an email with the specified options
 */
export async function sendMail(options: EmailOptions): Promise<void> {
    try {
        // Make sure the transporter is initialized
        if (!transporter) {
            Logger.warn("Mail transporter not initialized, initializing now");
            initMailTransport();
        }

        await transporter.sendMail({
            from: "no-reply@takecareai.com",
            to: Array.isArray(options.to) ? options.to.join(",") : options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
    } catch (error) {
        Logger.error(`Failed to send email: ${JSON.stringify(error, null, 2)}`);
        throw new Error("Failed to send email");
    }
}

/**
 * Verify that the transporter is working correctly
 */
export async function verifyMailTransport(): Promise<boolean> {
    try {
        if (!transporter) {
            initMailTransport();
        }

        return await transporter.verify();
    } catch (error) {
        Logger.error(
            `Mail transport verification failed: ${JSON.stringify(error, null, 2)}`,
        );
        return false;
    }
}
